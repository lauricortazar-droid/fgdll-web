import "server-only";

import { isAdminEmail, PortalError, type PortalProfile } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";

const CENTER_FIELDS = [
  "name", "network", "state", "city", "address", "responsibleName", "phone", "whatsapp",
  "email", "website", "mapsUrl", "description", "services",
] as const;

type CenterField = (typeof CENTER_FIELDS)[number];

const COLUMN_BY_FIELD: Record<CenterField, string> = {
  name: "name",
  network: "network",
  state: "state",
  city: "city",
  address: "address",
  responsibleName: "responsible_name",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  website: "website",
  mapsUrl: "maps_url",
  description: "description",
  services: "services",
};

const CENTER_STATUSES = new Set(["published", "hidden", "archived"]);

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos de centros no está disponible.", 503);
  return database;
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email)) {
    throw new PortalError("Solo Administración General puede gestionar centros.", 403);
  }
}

function clean(value: unknown, max = 700) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizePhone(value: unknown) {
  return clean(value, 30).replace(/[^\d+]/g, "").slice(0, 18);
}

function validOptionalUrl(value: string, label: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
  } catch {
    throw new PortalError(`${label} no es válido.`);
  }
}

function centerFromRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    network: String(row.network ?? ""),
    state: String(row.state ?? ""),
    city: String(row.city ?? ""),
    address: String(row.address ?? ""),
    responsibleName: String(row.responsible_name ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    email: String(row.email ?? ""),
    website: String(row.website ?? ""),
    mapsUrl: String(row.maps_url ?? ""),
    description: String(row.description ?? ""),
    services: String(row.services ?? ""),
    status: String(row.status ?? "published"),
    version: Number(row.version ?? 1),
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    updatedAt: String(row.updated_at ?? ""),
    updatedBy: String(row.updated_by ?? "system"),
  };
}

function editableCenter(input: Record<string, unknown>) {
  const source = (input.center && typeof input.center === "object" ? input.center : input) as Record<string, unknown>;
  const value = Object.fromEntries(CENTER_FIELDS.map((field) => [
    field,
    field === "phone" || field === "whatsapp"
      ? normalizePhone(source[field])
      : clean(source[field], field === "description" || field === "services" ? 1600 : 700),
  ])) as Record<CenterField, string>;

  if (!value.name) throw new PortalError("Escribe el nombre del centro.");
  if (!value.city || !value.state) throw new PortalError("Escribe la ciudad y el estado.");
  if (!value.address) throw new PortalError("Escribe la dirección del centro.");
  if (!value.phone && !value.whatsapp) throw new PortalError("Agrega al menos un teléfono o WhatsApp.");
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw new PortalError("El correo del centro no es válido.");
  validOptionalUrl(value.website, "El sitio web");
  validOptionalUrl(value.mapsUrl, "El enlace del mapa");
  return value;
}

async function audit(profile: PortalProfile, action: string, centerId: number, details: unknown) {
  await db().prepare(
    "INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, 'rehabilitation_center', ?, ?)",
  ).bind(profile.email, action, String(centerId), JSON.stringify(details)).run();
}

export async function listCentersForAdmin(profile: PortalProfile) {
  requireAdmin(profile);
  const result = await db().prepare(
    `SELECT * FROM rehabilitation_centers
     ORDER BY CASE status WHEN 'published' THEN 0 WHEN 'hidden' THEN 1 WHEN 'archived' THEN 2 ELSE 3 END,
       state, city, name`,
  ).all<Record<string, unknown>>();
  return (result.results ?? []).map(centerFromRow);
}

export async function updateCenterAsAdmin(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0) throw new PortalError("Selecciona un centro válido.");
  const existing = await db().prepare("SELECT * FROM rehabilitation_centers WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!existing) throw new PortalError("El centro ya no existe.", 404);

  const center = editableCenter(input);
  const requestedStatus = clean(input.status, 30) || String(existing.status ?? "published");
  if (!CENTER_STATUSES.has(requestedStatus)) throw new PortalError("Selecciona un estado válido para el centro.");

  const assignments = CENTER_FIELDS.map((field) => `${COLUMN_BY_FIELD[field]} = ?`).join(", ");
  const result = await db().prepare(
    `UPDATE rehabilitation_centers SET ${assignments}, status = ?, version = version + 1,
       verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
  ).bind(...CENTER_FIELDS.map((field) => center[field]), requestedStatus, profile.email, id).run();
  if (!result.meta.changes) throw new PortalError("No fue posible actualizar el centro.", 409);

  await audit(profile, "center_admin_updated", id, {
    previousVersion: Number(existing.version ?? 1),
    status: requestedStatus,
    name: center.name,
  });
  return { id, updated: true, status: requestedStatus };
}

export async function archiveCenterAsAdmin(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0) throw new PortalError("Selecciona un centro válido.");
  const existing = await db().prepare("SELECT id, name, status, version FROM rehabilitation_centers WHERE id = ?")
    .bind(id).first<Record<string, unknown>>();
  if (!existing) throw new PortalError("El centro ya no existe.", 404);
  if (clean(input.confirmation, 220) !== String(existing.name)) {
    throw new PortalError("Escribe el nombre exacto del centro para confirmar que se retire del portal.");
  }

  await db().batch([
    db().prepare(`UPDATE rehabilitation_centers SET status = 'archived', version = version + 1,
      updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`).bind(profile.email, id),
    db().prepare("UPDATE center_directors SET active = 0 WHERE center_id = ?").bind(id),
  ]);
  await audit(profile, "center_admin_archived", id, { name: existing.name, previousStatus: existing.status, previousVersion: existing.version });
  return { id, archived: true };
}

export async function restoreCenterAsAdmin(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0) throw new PortalError("Selecciona un centro válido.");
  const existing = await db().prepare("SELECT id, name, status FROM rehabilitation_centers WHERE id = ?")
    .bind(id).first<Record<string, unknown>>();
  if (!existing) throw new PortalError("El centro ya no existe.", 404);
  if (String(existing.status) !== "archived") throw new PortalError("Este centro no está archivado.", 409);

  await db().prepare(`UPDATE rehabilitation_centers SET status = 'hidden', version = version + 1,
    updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`).bind(profile.email, id).run();
  await audit(profile, "center_admin_restored", id, { name: existing.name, status: "hidden" });
  return { id, restored: true, status: "hidden" };
}
