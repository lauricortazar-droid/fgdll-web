import "server-only";

import centerData from "../public-centers-data.json";
import { getRuntimeEnv } from "./runtime-env";
import { isAdminEmail, PortalError, type PortalProfile } from "./directory-store";

export type Center = {
  id: number; name: string; network: string; state: string; city: string; address: string;
  responsibleName: string;
  phone: string; whatsapp: string; email: string; website: string; mapsUrl: string;
  description: string; services: string; status: string; version: number;
  verifiedAt: string | null; updatedAt: string; updatedBy: string;
};

const CENTER_FIELDS = ["name", "network", "state", "city", "address", "responsibleName", "phone", "whatsapp", "email", "website", "mapsUrl", "description", "services"] as const;
type CenterField = (typeof CENTER_FIELDS)[number];

function d1() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos de centros no está disponible.", 503);
  return database;
}

function clean(value: unknown, max = 700) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function centerFromRow(row: Record<string, unknown>): Center {
  return {
    id: Number(row.id), name: String(row.name ?? ""), network: String(row.network ?? "Red Teocalli"),
    state: String(row.state ?? ""), city: String(row.city ?? ""), address: String(row.address ?? ""),
    responsibleName: String(row.responsible_name ?? ""),
    phone: String(row.phone ?? ""), whatsapp: String(row.whatsapp ?? ""), email: String(row.email ?? ""),
    website: String(row.website ?? ""), mapsUrl: String(row.maps_url ?? ""),
    description: String(row.description ?? ""), services: String(row.services ?? ""),
    status: String(row.status ?? "published"), version: Number(row.version ?? 1),
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    updatedAt: String(row.updated_at ?? ""), updatedBy: String(row.updated_by ?? "system"),
  };
}

async function ensureCentersSeeded() {
  const database = d1();
  const marker = await database.prepare("SELECT value FROM content_settings WHERE key = 'teocalli_centers_aug_2026'").first<{ value: string }>();
  if (marker) return;
  const statements = centerData.centros.map((center) => database.prepare(`INSERT OR IGNORE INTO rehabilitation_centers
    (name, network, state, city, address, responsible_name, phone, whatsapp, status, verified_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, 'teocalli-import-2026-08')`)
    .bind(center.name, center.network, center.state, center.city, center.address, center.responsibleName, center.phone, center.whatsapp));
  for (let index = 0; index < statements.length; index += 40) await database.batch(statements.slice(index, index + 40));
  await database.prepare("INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('teocalli_centers_aug_2026', '28', CURRENT_TIMESTAMP)").run();
}

function proposalFrom(input: Record<string, unknown>) {
  const proposal = Object.fromEntries(CENTER_FIELDS.map((field) => [field, clean(input[field], field === "description" || field === "services" ? 1600 : 700)])) as Record<CenterField, string>;
  if (!proposal.name) throw new PortalError("Escribe el nombre del centro.");
  if (!proposal.city || !proposal.state) throw new PortalError("Escribe la ciudad y el estado del centro.");
  if (!proposal.address) throw new PortalError("Escribe la dirección del centro.");
  if (!proposal.phone && !proposal.whatsapp) throw new PortalError("Agrega al menos un teléfono o WhatsApp de contacto.");
  if (proposal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proposal.email)) throw new PortalError("El correo del centro no es válido.");
  for (const field of ["website", "mapsUrl"] as const) {
    if (!proposal[field]) continue;
    try { const url = new URL(proposal[field]); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch { throw new PortalError(`${field === "website" ? "El sitio web" : "El enlace del mapa"} no es válido.`); }
  }
  proposal.phone = proposal.phone.replace(/[^\d+]/g, "").slice(0, 18);
  proposal.whatsapp = proposal.whatsapp.replace(/[^\d+]/g, "").slice(0, 18);
  return proposal;
}

function folio() { return `CTR-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }

async function audit(actorEmail: string, action: string, targetId: string, details: unknown) {
  await d1().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, 'center_request', ?, ?)")
    .bind(actorEmail, action, targetId, JSON.stringify(details)).run();
}

async function notifyAdmins(subject: string, html: string) {
  const env = getRuntimeEnv();
  if (!env.RESEND_API_KEY) return { sent: false, reason: "email_not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.FGDLL_EMAIL_FROM || "Portal FGDLL <notificaciones@fgdll.org>",
        to: ["admin@fgdll.org", "jaguarcortazar@gmail.com"], subject, html,
      }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
    return { sent: true };
  } catch (error) {
    console.error("No fue posible enviar el aviso de centros", error);
    return { sent: false, reason: "email_failed" };
  }
}

export async function listPublicCenters() {
  await ensureCentersSeeded();
  const rows = await d1().prepare("SELECT * FROM rehabilitation_centers WHERE status = 'published' ORDER BY state, city, name").all<Record<string, unknown>>();
  return (rows.results ?? []).map(centerFromRow);
}

export async function getCenter(id: number) {
  const row = await d1().prepare("SELECT * FROM rehabilitation_centers WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return row ? centerFromRow(row) : null;
}

export async function getCenterWorkspace(email: string, profile: PortalProfile | null) {
  const assignment = await d1().prepare("SELECT center_id FROM center_directors WHERE email = ? AND active = 1 ORDER BY approved_at DESC LIMIT 1")
    .bind(email.toLowerCase()).first<{ center_id: number }>();
  const center = assignment?.center_id ? await getCenter(Number(assignment.center_id)) : (profile?.centerId ? await getCenter(profile.centerId) : null);
  const rows = await d1().prepare("SELECT * FROM center_requests WHERE requester_email = ? ORDER BY created_at DESC")
    .bind(email.toLowerCase()).all<Record<string, unknown>>();
  return { center, requests: rows.results ?? [] };
}

export async function submitCenterRegistration(user: { email: string; displayName: string }, input: Record<string, unknown>) {
  const existing = await d1().prepare("SELECT id FROM center_requests WHERE requester_email = ? AND status IN ('pending','changes_requested') LIMIT 1")
    .bind(user.email.toLowerCase()).first<{ id: string }>();
  if (existing) throw new PortalError(`Ya tienes una solicitud abierta con el folio ${existing.id}.`, 409);
  const proposed = proposalFrom((input.center ?? {}) as Record<string, unknown>);
  const id = folio();
  await d1().prepare(`INSERT INTO center_requests
    (id, request_type, requester_email, requester_name, requester_phone, proposed_json, requester_note)
    VALUES (?, 'registration', ?, ?, ?, ?, ?)`)
    .bind(id, user.email.toLowerCase(), clean(input.requesterName || user.displayName, 160), clean(input.requesterPhone, 30), JSON.stringify(proposed), clean(input.note, 1200)).run();
  await audit(user.email, "center_registration_requested", id, { name: proposed.name, city: proposed.city, state: proposed.state });
  const email = await notifyAdmins(`Nueva solicitud de centro ${id}`, `<h2>Nueva solicitud de centro</h2><p><strong>Folio:</strong> ${id}</p><p><strong>Centro:</strong> ${proposed.name}</p><p><strong>Solicita:</strong> ${clean(input.requesterName || user.displayName, 160)} (${user.email})</p><p>Revísala en la administración de Portal FGDLL.</p>`);
  return { id, status: "pending", email };
}

export async function submitCenterChange(user: { email: string; displayName: string }, profile: PortalProfile | null, input: Record<string, unknown>) {
  const assignment = await d1().prepare("SELECT center_id FROM center_directors WHERE email = ? AND active = 1 ORDER BY approved_at DESC LIMIT 1")
    .bind(user.email.toLowerCase()).first<{ center_id: number }>();
  const assignedCenterId = Number(assignment?.center_id ?? profile.centerId ?? 0);
  if (!assignedCenterId) throw new PortalError("No tienes un centro asignado.", 403);
  const center = await getCenter(assignedCenterId);
  if (!center) throw new PortalError("El centro asignado ya no existe.", 404);
  const open = await d1().prepare("SELECT id FROM center_requests WHERE center_id = ? AND status IN ('pending','changes_requested') LIMIT 1")
    .bind(center.id).first<{ id: string }>();
  if (open) throw new PortalError(`Ya existe una modificación abierta con el folio ${open.id}.`, 409);
  const proposed = proposalFrom((input.center ?? {}) as Record<string, unknown>);
  const changed = CENTER_FIELDS.filter((field) => proposed[field] !== center[field]);
  if (!changed.length) throw new PortalError("No hay cambios para enviar.");
  const id = folio();
  await d1().prepare(`INSERT INTO center_requests
    (id, request_type, center_id, center_version, requester_email, requester_name, requester_phone, proposed_json, original_json, requester_note)
    VALUES (?, 'update', ?, ?, ?, ?, '', ?, ?, ?)`)
    .bind(id, center.id, center.version, user.email, profile?.name || user.displayName, JSON.stringify(proposed), JSON.stringify(center), clean(input.note, 1200)).run();
  await audit(user.email, "center_change_requested", id, { centerId: center.id, changed });
  const email = await notifyAdmins(`Solicitud de cambio de centro ${id}`, `<h2>Cambio pendiente de aprobación</h2><p><strong>Folio:</strong> ${id}</p><p><strong>Centro:</strong> ${center.name}</p><p><strong>Solicita:</strong> ${profile?.name || user.displayName} (${user.email})</p><p><strong>Campos modificados:</strong> ${changed.join(", ")}</p><p>Revísala en la administración de Portal FGDLL.</p>`);
  return { id, status: "pending", email };
}

export async function resubmitCenterRequest(user: { email: string; displayName: string }, input: Record<string, unknown>) {
  const id = clean(input.id, 40);
  const row = await d1().prepare("SELECT * FROM center_requests WHERE id = ? AND requester_email = ?")
    .bind(id, user.email.toLowerCase()).first<Record<string, unknown>>();
  if (!row) throw new PortalError("Solicitud no encontrada.", 404);
  if (String(row.status) !== "changes_requested") throw new PortalError("Esta solicitud no admite correcciones ahora.", 409);
  const proposal = proposalFrom((input.center ?? {}) as Record<string, unknown>);
  await d1().prepare("UPDATE center_requests SET proposed_json = ?, requester_note = ?, status = 'pending', reviewer_email = NULL, review_note = '', reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND requester_email = ?")
    .bind(JSON.stringify(proposal), clean(input.note, 1200), id, user.email.toLowerCase()).run();
  await audit(user.email, "center_request_resubmitted", id, { name: proposal.name });
  const email = await notifyAdmins(`Solicitud de centro corregida ${id}`, `<h2>Solicitud corregida</h2><p><strong>Folio:</strong> ${id}</p><p><strong>Centro:</strong> ${proposal.name}</p><p><strong>Solicita:</strong> ${user.displayName} (${user.email})</p><p>Revísala nuevamente en Portal FGDLL.</p>`);
  return { id, status: "pending", email };
}

export async function listCenterRequests(profile: PortalProfile) {
  if (!isAdminEmail(profile.email)) throw new PortalError("Solo Administración General puede revisar centros.", 403);
  const rows = await d1().prepare(`SELECT cr.*, rc.name AS current_center_name FROM center_requests cr
    LEFT JOIN rehabilitation_centers rc ON rc.id = cr.center_id
    ORDER BY CASE cr.status WHEN 'pending' THEN 0 WHEN 'changes_requested' THEN 1 ELSE 2 END, cr.created_at DESC`).all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function reviewCenterRequest(profile: PortalProfile, input: { id: string; action: string; note?: string }) {
  if (!isAdminEmail(profile.email)) throw new PortalError("Solo Administración General puede aprobar centros.", 403);
  if (!["approve", "reject", "request_changes"].includes(input.action)) throw new PortalError("Acción no válida.");
  if (input.action === "request_changes" && !clean(input.note, 1000)) throw new PortalError("Indica qué debe corregirse.");
  const row = await d1().prepare("SELECT * FROM center_requests WHERE id = ?").bind(input.id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("Solicitud no encontrada.", 404);
  if (!["pending", "changes_requested"].includes(String(row.status))) throw new PortalError("Esta solicitud ya fue resuelta.", 409);
  const proposal = proposalFrom(JSON.parse(String(row.proposed_json)));
  const status = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "changes_requested";
  let centerId = row.center_id == null ? null : Number(row.center_id);
  const statements = [];
  if (status === "approved" && row.request_type === "registration") {
    const result = await d1().prepare(`INSERT INTO rehabilitation_centers
      (name, network, state, city, address, responsible_name, phone, whatsapp, email, website, maps_url, description, services, status, verified_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, ?)`)
      .bind(...CENTER_FIELDS.map((field) => proposal[field]), profile.email).run();
    centerId = Number((result.meta as { last_row_id?: number }).last_row_id);
    if (!centerId) {
      const created = await d1().prepare("SELECT id FROM rehabilitation_centers WHERE name = ? AND city = ? ORDER BY id DESC LIMIT 1").bind(proposal.name, proposal.city).first<{ id: number }>();
      centerId = Number(created?.id);
    }
    statements.push(d1().prepare(`INSERT INTO center_directors
      (center_id, email, name, phone, active, approved_by)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(center_id, email) DO UPDATE SET name = excluded.name, phone = excluded.phone, active = 1, approved_by = excluded.approved_by, approved_at = CURRENT_TIMESTAMP`)
      .bind(centerId, row.requester_email, row.requester_name, row.requester_phone ?? "", profile.email));
  } else if (status === "approved" && row.request_type === "update") {
    const result = await d1().prepare(`UPDATE rehabilitation_centers SET
      name = ?, network = ?, state = ?, city = ?, address = ?, responsible_name = ?, phone = ?, whatsapp = ?, email = ?, website = ?, maps_url = ?, description = ?, services = ?,
      version = version + 1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND version = ?`)
      .bind(...CENTER_FIELDS.map((field) => proposal[field]), profile.email, centerId, Number(row.center_version)).run();
    if (!result.meta.changes) throw new PortalError("El centro cambió después de esta solicitud. Revísalo antes de aprobar.", 409);
  }
  statements.push(d1().prepare("UPDATE center_requests SET status = ?, center_id = ?, reviewer_email = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, centerId, profile.email, clean(input.note, 1000), input.id));
  await d1().batch(statements);
  await audit(profile.email, `center_request_${status}`, input.id, { centerId, note: clean(input.note, 1000) });
  return { id: input.id, status, centerId };
}
