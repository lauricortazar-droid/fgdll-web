import "server-only";

import directoryData from "../directory-data.json";
import { getRuntimeEnv } from "./runtime-env";

export const ADMIN_CONTACT_EMAIL = "admin@fgdll.org";
export const PORTAL_ROLES = ["leader", "osg", "delegate", "council", "admin"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export type PortalProfile = {
  email: string;
  name: string;
  role: PortalRole;
  zone: string | null;
  groupId: number | null;
  active: boolean;
};

export type DirectoryGroup = {
  id: number;
  zone: string;
  name: string;
  city: string;
  leaderName: string;
  subleaderName: string;
  whatsapp: string;
  email: string;
  facebook: string;
  address: string;
  mapsUrl: string;
  schedules: string;
  status: string;
  version: number;
  verifiedAt: string | null;
  updatedAt: string;
  updatedBy: string;
};

export const EDITABLE_GROUP_FIELDS = [
  "zone", "name", "city", "leaderName", "subleaderName", "whatsapp", "email",
  "facebook", "address", "mapsUrl", "schedules", "status",
] as const;
export type EditableGroupField = (typeof EDITABLE_GROUP_FIELDS)[number];

const SENSITIVE_FIELDS = new Set<EditableGroupField>(["zone", "name", "leaderName", "status"]);
const DIRECTORY_ZONES = new Set(["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"]);
const ROLE_LABELS: Record<PortalRole, string> = {
  leader: "Líder",
  osg: "OSG",
  delegate: "Delegado",
  council: "Consejo Directivo",
  admin: "Administrador",
};

export class PortalError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function d1() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos del portal no está disponible.", 503);
  return database;
}

function adminEmails() {
  const configured = getRuntimeEnv().FGDLL_ADMIN_EMAILS ??
    "admin@fgdll.org,jaguarcortazar@gmail.com,laurcortazar@gmail.com";
  return new Set(configured.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email: string) {
  return adminEmails().has(email.trim().toLowerCase());
}

export function roleLabel(role: PortalRole) { return ROLE_LABELS[role]; }

export function isPortalRole(value: string): value is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(value);
}

export async function ensureDirectorySeeded() {
  const database = d1();
  const result = await database.prepare("SELECT COUNT(*) AS total FROM directory_groups").first<{ total: number }>();
  if (Number(result?.total ?? 0) > 0) return;

  const statements = directoryData.grupos.map((group) => database.prepare(
    `INSERT OR IGNORE INTO directory_groups
      (zone, name, city, leader_name, whatsapp, facebook, address, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'initial-import')`
  ).bind(
    group.zona.trim(), group.nombre.trim(), group.ciudad?.trim() ?? "",
    group.lider?.trim() ?? "", group.whatsapp?.trim() ?? "",
    group.facebook?.trim() ?? "", group.direccion?.trim() ?? "",
  ));
  for (let index = 0; index < statements.length; index += 40) {
    await database.batch(statements.slice(index, index + 40));
  }
}

function mapGroup(row: Record<string, unknown>): DirectoryGroup {
  return {
    id: Number(row.id), zone: String(row.zone ?? ""), name: String(row.name ?? ""),
    city: String(row.city ?? ""), leaderName: String(row.leader_name ?? ""),
    subleaderName: String(row.subleader_name ?? ""), whatsapp: String(row.whatsapp ?? ""),
    email: String(row.email ?? ""), facebook: String(row.facebook ?? ""),
    address: String(row.address ?? ""), mapsUrl: String(row.maps_url ?? ""),
    schedules: String(row.schedules ?? ""), status: String(row.status ?? "active"),
    version: Number(row.version ?? 1), verifiedAt: row.verified_at ? String(row.verified_at) : null,
    updatedAt: String(row.updated_at ?? ""), updatedBy: String(row.updated_by ?? "system"),
  };
}

export async function listDirectoryGroups(includeInactive = false) {
  await ensureDirectorySeeded();
  const query = includeInactive
    ? "SELECT * FROM directory_groups ORDER BY zone, name"
    : "SELECT * FROM directory_groups WHERE status = 'active' ORDER BY zone, name";
  const result = await d1().prepare(query).all<Record<string, unknown>>();
  return (result.results ?? []).map(mapGroup);
}

export async function getDirectoryGroup(id: number) {
  await ensureDirectorySeeded();
  const row = await d1().prepare("SELECT * FROM directory_groups WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return row ? mapGroup(row) : null;
}

export async function getPortalProfile(email: string, displayName = ""): Promise<PortalProfile | null> {
  const normalized = email.trim().toLowerCase();
  if (isAdminEmail(normalized)) {
    return { email: normalized, name: displayName || normalized, role: "admin", zone: null, groupId: null, active: true };
  }
  const row = await d1().prepare(
    "SELECT email, name, role, zone, group_id, active FROM portal_users WHERE email = ?"
  ).bind(normalized).first<Record<string, unknown>>();
  if (!row || !Number(row.active) || !isPortalRole(String(row.role))) return null;
  return {
    email: String(row.email), name: String(row.name || displayName || row.email), role: String(row.role) as PortalRole,
    zone: row.zone ? String(row.zone) : null, groupId: row.group_id == null ? null : Number(row.group_id), active: true,
  };
}

export function canManageGroup(profile: PortalProfile, group: DirectoryGroup) {
  if (profile.role === "admin" || profile.role === "council") return true;
  if (profile.role === "delegate") return Boolean(profile.zone && profile.zone === group.zone);
  return Boolean(profile.groupId && profile.groupId === group.id);
}

export async function groupsForProfile(profile: PortalProfile) {
  const groups = await listDirectoryGroups(true);
  return groups.filter((group: DirectoryGroup) => canManageGroup(profile, group));
}

function safeText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function sanitizeProposal(payload: Record<string, unknown>) {
  const proposal: Partial<Record<EditableGroupField, string>> = {};
  for (const field of EDITABLE_GROUP_FIELDS) {
    if (field in payload) proposal[field] = safeText(payload[field], field === "schedules" ? 1200 : 500);
  }
  if (proposal.whatsapp) proposal.whatsapp = proposal.whatsapp.replace(/[^\d+]/g, "").slice(0, 16);
  if (proposal.status && !["active", "suspended", "closed"].includes(proposal.status)) delete proposal.status;
  if (proposal.zone !== undefined && !DIRECTORY_ZONES.has(proposal.zone)) throw new PortalError("Selecciona una zona válida.");
  if (proposal.name !== undefined && !proposal.name) throw new PortalError("El nombre del grupo no puede quedar vacío.");
  for (const field of ["facebook", "mapsUrl"] as const) {
    const value = proposal[field];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
    } catch {
      throw new PortalError(`${field === "facebook" ? "Facebook" : "El enlace de mapa"} debe ser una dirección web válida.`);
    }
  }
  if (proposal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proposal.email)) {
    throw new PortalError("El correo del grupo no tiene un formato válido.");
  }
  return proposal;
}

function changedFields(group: DirectoryGroup, proposal: Partial<Record<EditableGroupField, string>>) {
  return Object.keys(proposal).filter((field) => String(group[field as EditableGroupField] ?? "") !== String(proposal[field as EditableGroupField] ?? "")) as EditableGroupField[];
}

function makeFolio(prefix: "ACC" | "DIR") {
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function audit(actorEmail: string, action: string, targetType: string, targetId: string, details: unknown = {}) {
  await d1().prepare(
    "INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?)"
  ).bind(actorEmail, action, targetType, targetId, JSON.stringify(details)).run();
}

export async function createAccessRequest(input: {
  email: string; name: string; phone?: string; requestedRole: string; zone?: string;
  groupId?: number | null; groupName?: string; reason?: string;
}) {
  await ensureDirectorySeeded();
  if (!isPortalRole(input.requestedRole) || input.requestedRole === "admin") throw new PortalError("Selecciona un tipo de acceso válido.");
  const existing = await d1().prepare(
    "SELECT id FROM access_requests WHERE requester_email = ? AND status IN ('pending','in_review','changes_requested') LIMIT 1"
  ).bind(input.email.toLowerCase()).first<{ id: string }>();
  if (existing) throw new PortalError(`Ya existe una solicitud pendiente con el folio ${existing.id}.`, 409);
  const id = makeFolio("ACC");
  await d1().prepare(
    `INSERT INTO access_requests
      (id, requester_email, requester_name, phone, requested_role, zone, group_id, group_name, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, input.email.toLowerCase(), safeText(input.name, 160), safeText(input.phone, 30), input.requestedRole,
    safeText(input.zone, 60) || null, input.groupId || null, safeText(input.groupName, 160), safeText(input.reason, 1200),
  ).run();
  await audit(input.email, "access_requested", "access_request", id, { role: input.requestedRole, zone: input.zone, groupId: input.groupId });
  return { id, status: "pending", contactEmail: ADMIN_CONTACT_EMAIL };
}

export async function listAccessRequests(profile: PortalProfile, requesterEmail?: string) {
  const database = d1();
  if (profile.role === "admin" || profile.role === "council") {
    const result = await database.prepare(
      `SELECT ar.*, dg.name AS directory_group_name FROM access_requests ar
       LEFT JOIN directory_groups dg ON dg.id = ar.group_id
       ORDER BY CASE ar.status WHEN 'pending' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END, ar.created_at DESC`
    ).all<Record<string, unknown>>();
    return result.results ?? [];
  }
  const result = await database.prepare(
    "SELECT * FROM access_requests WHERE requester_email = ? ORDER BY created_at DESC"
  ).bind((requesterEmail ?? profile.email).toLowerCase()).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function listOwnAccessRequests(requesterEmail: string) {
  const result = await d1().prepare(
    `SELECT ar.*, dg.name AS directory_group_name FROM access_requests ar
     LEFT JOIN directory_groups dg ON dg.id = ar.group_id
     WHERE ar.requester_email = ? ORDER BY ar.created_at DESC`
  ).bind(requesterEmail.trim().toLowerCase()).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function reviewAccessRequest(profile: PortalProfile, input: { id: string; action: string; note?: string }) {
  if (!['admin', 'council'].includes(profile.role)) throw new PortalError("No tienes permiso para revisar accesos.", 403);
  if (!['approve', 'reject', 'request_changes'].includes(input.action)) throw new PortalError("Acción no válida.");
  const request = await d1().prepare("SELECT * FROM access_requests WHERE id = ?").bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  if (!["pending", "in_review", "changes_requested"].includes(String(request.status))) throw new PortalError("Esta solicitud ya fue resuelta.", 409);

  const status = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "changes_requested";
  const statements = [d1().prepare(
    "UPDATE access_requests SET status = ?, reviewer_email = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(status, profile.email, safeText(input.note, 1000), input.id)];
  if (status === "approved") {
    const role = String(request.requested_role);
    if (!isPortalRole(role) || role === "admin") throw new PortalError("El perfil solicitado no es válido.");
    if ((role === "leader" || role === "osg") && request.group_id == null) {
      throw new PortalError("La solicitud necesita un grupo asignado antes de aprobarse.");
    }
    if (role === "delegate" && !request.zone) {
      throw new PortalError("La solicitud necesita una zona asignada antes de aprobarse.");
    }
    statements.push(d1().prepare(
      `INSERT INTO portal_users (email, name, role, zone, group_id, active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, zone = excluded.zone,
       group_id = excluded.group_id, active = 1, updated_at = CURRENT_TIMESTAMP`
    ).bind(request.requester_email, request.requester_name, role, request.zone ?? null, request.group_id ?? null));
  }
  await d1().batch(statements);
  await audit(profile.email, `access_${status}`, "access_request", input.id, { note: input.note });
  return { id: input.id, status };
}

async function applyGroupUpdate(group: DirectoryGroup, proposal: Partial<Record<EditableGroupField, string>>, actorEmail: string) {
  const changed = changedFields(group, proposal);
  if (!changed.length) throw new PortalError("No hay cambios para guardar.");
  const columnMap: Record<EditableGroupField, string> = {
    zone: "zone", name: "name", city: "city", leaderName: "leader_name", subleaderName: "subleader_name",
    whatsapp: "whatsapp", email: "email", facebook: "facebook", address: "address", mapsUrl: "maps_url",
    schedules: "schedules", status: "status",
  };
  const assignments = changed.map((field) => `${columnMap[field]} = ?`);
  const values = changed.map((field) => proposal[field] ?? "");
  const result = await d1().prepare(
    `UPDATE directory_groups SET ${assignments.join(", ")}, version = version + 1,
     verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = ?
     WHERE id = ? AND version = ?`
  ).bind(...values, actorEmail, group.id, group.version).run();
  if (!result.meta.changes) throw new PortalError("El grupo cambió mientras lo editabas. Actualiza la página y vuelve a intentarlo.", 409);
  return changed;
}

export async function submitDirectoryChange(profile: PortalProfile, input: {
  groupId: number; proposal: Record<string, unknown>; note?: string;
}) {
  const group = await getDirectoryGroup(input.groupId);
  if (!group) throw new PortalError("Grupo no encontrado.", 404);
  if (!canManageGroup(profile, group)) throw new PortalError("No tienes permiso para modificar este grupo.", 403);
  const proposal = sanitizeProposal(input.proposal);
  const changed = changedFields(group, proposal);
  if (!changed.length) throw new PortalError("No hay cambios para enviar.");
  const changedProposal = Object.fromEntries(
    changed.map((field) => [field, proposal[field] ?? ""]),
  ) as Partial<Record<EditableGroupField, string>>;
  const sensitive = changed.some((field) => SENSITIVE_FIELDS.has(field));
  const direct = profile.role === "admin" || profile.role === "council" || (profile.role === "delegate" && !sensitive);
  const id = makeFolio("DIR");
  const status = direct ? "approved" : "pending";

  await d1().prepare(
    `INSERT INTO directory_change_requests
      (id, group_id, group_version, requester_email, requester_name, requester_role, status,
       original_json, proposed_json, requester_note, reviewer_email, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, group.id, group.version, profile.email, profile.name, profile.role, status,
    JSON.stringify(group), JSON.stringify(changedProposal), safeText(input.note, 1200),
    direct ? profile.email : null, direct ? new Date().toISOString() : null,
  ).run();
  if (direct) await applyGroupUpdate(group, changedProposal, profile.email);
  await audit(profile.email, direct ? "directory_updated" : "directory_change_requested", "directory_group", String(group.id), { requestId: id, changed });
  return { id, status, changed, requiresApproval: !direct, contactEmail: ADMIN_CONTACT_EMAIL };
}

export async function listDirectoryChanges(profile: PortalProfile) {
  let where = "1 = 1";
  const values: unknown[] = [];
  if (profile.role === "delegate") { where = "dg.zone = ?"; values.push(profile.zone); }
  else if (profile.role === "leader" || profile.role === "osg") { where = "dcr.requester_email = ?"; values.push(profile.email); }
  const result = await d1().prepare(
    `SELECT dcr.*, dg.name AS group_name, dg.zone AS group_zone
     FROM directory_change_requests dcr JOIN directory_groups dg ON dg.id = dcr.group_id
     WHERE ${where}
     ORDER BY CASE dcr.status WHEN 'pending' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END, dcr.created_at DESC`
  ).bind(...values).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function reviewDirectoryChange(profile: PortalProfile, input: { id: string; action: string; note?: string }) {
  if (!["admin", "council", "delegate"].includes(profile.role)) throw new PortalError("No tienes permiso para revisar cambios.", 403);
  if (!["approve", "reject", "request_changes"].includes(input.action)) throw new PortalError("Acción no válida.");
  const request = await d1().prepare(
    `SELECT dcr.*, dg.zone AS group_zone FROM directory_change_requests dcr
     JOIN directory_groups dg ON dg.id = dcr.group_id WHERE dcr.id = ?`
  ).bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  if (!["pending", "in_review", "changes_requested"].includes(String(request.status))) throw new PortalError("Esta solicitud ya fue resuelta.", 409);
  if (profile.role === "delegate" && profile.zone !== request.group_zone) throw new PortalError("Esta solicitud pertenece a otra zona.", 403);
  const proposal = JSON.parse(String(request.proposed_json)) as Partial<Record<EditableGroupField, string>>;
  const sensitive = Object.keys(proposal).some((field) => SENSITIVE_FIELDS.has(field as EditableGroupField));
  if (profile.role === "delegate" && sensitive && input.action === "approve") {
    throw new PortalError("Los cambios de nombre, zona, líder o estado deben ser aprobados por Consejo o administración.", 403);
  }
  const status = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "changes_requested";
  if (status === "approved") {
    const group = await getDirectoryGroup(Number(request.group_id));
    if (!group) throw new PortalError("Grupo no encontrado.", 404);
    if (group.version !== Number(request.group_version)) throw new PortalError("El registro cambió después de esta solicitud. Revísalo antes de aprobar.", 409);
    await applyGroupUpdate(group, proposal, profile.email);
  }
  await d1().prepare(
    "UPDATE directory_change_requests SET status = ?, reviewer_email = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(status, profile.email, safeText(input.note, 1000), input.id).run();
  await audit(profile.email, `directory_change_${status}`, "directory_change_request", input.id, { note: input.note });
  return { id: input.id, status };
}

export async function dashboardStats(profile: PortalProfile) {
  const groups = await groupsForProfile(profile);
  const changes = await listDirectoryChanges(profile);
  const access = profile.role === "admin" || profile.role === "council" ? await listAccessRequests(profile) : [];
  return {
    groups: groups.length,
    pendingChanges: changes.filter((item: Record<string, unknown>) => item.status === "pending").length,
    pendingAccess: access.filter((item: Record<string, unknown>) => item.status === "pending").length,
  };
}
