import "server-only";

import directoryData from "../directory-data.json";
import { getRuntimeEnv } from "./runtime-env";
import { notifyAdmins, notifyRecipients } from "./notification-store";

export const ADMIN_CONTACT_EMAIL = "admin@fgdll.org";
export const PORTAL_ROLES = ["member", "leader", "osg", "delegate", "director", "council", "admin"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export type PortalProfile = {
  email: string;
  name: string;
  role: PortalRole;
  roleLabel: string;
  zone: string | null;
  groupId: number | null;
  centerId: number | null;
  active: boolean;
};

export type PortalUserInput = {
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  roleLabel?: string;
  zone?: string;
  groupId?: number | null;
  centerId?: number | null;
  notes?: string;
  active?: boolean;
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
  sessionTypes: string;
  status: string;
  version: number;
  verifiedAt: string | null;
  updatedAt: string;
  updatedBy: string;
};

export const EDITABLE_GROUP_FIELDS = [
  "zone", "name", "city", "leaderName", "subleaderName", "whatsapp", "email",
  "facebook", "address", "mapsUrl", "schedules", "sessionTypes", "status",
] as const;
export type EditableGroupField = (typeof EDITABLE_GROUP_FIELDS)[number];

const SENSITIVE_FIELDS = new Set<EditableGroupField>(["zone", "name", "leaderName", "status"]);
const DIRECTORY_ZONES = new Set(["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"]);
const ROLE_LABELS: Record<PortalRole, string> = {
  member: "Guerrero de la Luz",
  leader: "Líder",
  osg: "OSG",
  delegate: "Delegado",
  director: "Director de centro",
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
    "admin@fgdll.org,jaguarcortazar@gmail.com,laurcortazar@gmail.com,yoltyp@gmail.com";
  return new Set(configured.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email: string) {
  return adminEmails().has(email.trim().toLowerCase());
}

export function configuredAdminEmails() {
  return Array.from(adminEmails());
}

function primaryAdminEmail() {
  return configuredAdminEmails()[0] || ADMIN_CONTACT_EMAIL;
}

export function roleLabel(role: PortalRole) { return ROLE_LABELS[role]; }

export function isPortalRole(value: string): value is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(value);
}

export async function ensureDirectorySeeded() {
  const database = d1();
  const seedMarker = await database.prepare(
    "SELECT value FROM content_settings WHERE key = 'directory_catalog_v1'"
  ).first<{ value: string }>();
  if (seedMarker) return;
  const result = await database.prepare("SELECT COUNT(*) AS total FROM directory_groups").first<{ total: number }>();
  if (Number(result?.total ?? 0) > 0) {
    await database.prepare(
      "INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('directory_catalog_v1', 'seeded', CURRENT_TIMESTAMP)"
    ).run();
    return;
  }

  const statements = directoryData.grupos.map((group) => database.prepare(
    `INSERT OR IGNORE INTO directory_groups
      (zone, name, city, leader_name, whatsapp, facebook, address, session_types, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'initial-import')`
  ).bind(
    group.zona.trim(), group.nombre.trim(), group.ciudad?.trim() ?? "",
    group.lider?.trim() ?? "", group.whatsapp?.trim() ?? "",
    group.facebook?.trim() ?? "", group.direccion?.trim() ?? "", group.tiposSesiones?.trim() ?? "",
  ));
  for (let index = 0; index < statements.length; index += 40) {
    await database.batch(statements.slice(index, index + 40));
  }
  await database.prepare(
    "INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('directory_catalog_v1', 'seeded', CURRENT_TIMESTAMP)"
  ).run();
}

function mapGroup(row: Record<string, unknown>): DirectoryGroup {
  return {
    id: Number(row.id), zone: String(row.zone ?? ""), name: String(row.name ?? ""),
    city: String(row.city ?? ""), leaderName: String(row.leader_name ?? ""),
    subleaderName: String(row.subleader_name ?? ""), whatsapp: String(row.whatsapp ?? ""),
    email: String(row.email ?? ""), facebook: String(row.facebook ?? ""),
    address: String(row.address ?? ""), mapsUrl: String(row.maps_url ?? ""),
    schedules: String(row.schedules ?? ""), sessionTypes: String(row.session_types ?? ""),
    status: String(row.status ?? "active"),
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
    return { email: normalized, name: displayName || normalized, role: "admin", roleLabel: ROLE_LABELS.admin, zone: null, groupId: null, centerId: null, active: true };
  }
  const row = await d1().prepare(
    "SELECT email, name, role, role_label, zone, group_id, center_id, active FROM portal_users WHERE email = ?"
  ).bind(normalized).first<Record<string, unknown>>();
  if (!row || !Number(row.active) || !isPortalRole(String(row.role))) return null;
  const role = String(row.role) as PortalRole;
  return {
    email: String(row.email), name: String(row.name || displayName || row.email), role,
    roleLabel: String(row.role_label || "") || ROLE_LABELS[role],
    zone: row.zone ? String(row.zone) : null, groupId: row.group_id == null ? null : Number(row.group_id),
    centerId: row.center_id == null ? null : Number(row.center_id), active: true,
  };
}

export function canManageGroup(profile: PortalProfile, group: DirectoryGroup) {
  if (profile.role === "admin" || profile.role === "council") return true;
  if (profile.role === "delegate") return Boolean(profile.zone && profile.zone === group.zone);
  if (profile.role === "member") return true;
  return Boolean(profile.groupId && profile.groupId === group.id);
}

export async function groupsForProfile(profile: PortalProfile) {
  const groups = await listDirectoryGroups(true);
  return groups.filter((group: DirectoryGroup) => canManageGroup(profile, group));
}

function safeText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeEmail(value: unknown) {
  const email = safeText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PortalError("Escribe un correo electrónico válido.");
  }
  return email;
}

function requestSnapshot(input: {
  email: string; name: string; phone?: string; requestedRole: string; zone?: string;
  groupId?: number | null; groupName?: string; reason?: string; status?: string; requestedRoleLabel?: string;
}) {
  return {
    requesterEmail: input.email,
    requesterName: input.name,
    phone: input.phone ?? "",
    requestedRole: input.requestedRole,
    requestedRoleLabel: input.requestedRoleLabel ?? "",
    zone: input.zone ?? null,
    groupId: input.groupId ?? null,
    groupName: input.groupName ?? "",
    reason: input.reason ?? "",
    status: input.status ?? "pending",
  };
}

function accessEventStatement(requestId: string, actorEmail: string, eventType: string, note: string, snapshot: unknown) {
  return d1().prepare(
    `INSERT INTO access_request_events
      (request_id, actor_email, event_type, note, snapshot_json)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(requestId, actorEmail.toLowerCase(), eventType, safeText(note, 1200), JSON.stringify(snapshot));
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
  groupId?: number | null; groupName?: string; reason?: string; requestedRoleLabel?: string;
}) {
  await ensureDirectorySeeded();
  if (!isPortalRole(input.requestedRole) || ["admin", "director"].includes(input.requestedRole)) throw new PortalError("Selecciona un tipo de acceso válido.");
  const email = normalizeEmail(input.email);
  const requestedRoleLabel = input.requestedRole === "member"
    ? safeText(input.requestedRoleLabel, 80) || "Guerrero de la Luz"
    : ROLE_LABELS[input.requestedRole];
  if (input.requestedRole === "member") {
    await d1().prepare(
      `INSERT INTO portal_users (email, name, phone, role, role_label, active, notes, source, created_by)
       VALUES (?, ?, ?, 'member', ?, 1, ?, 'self_registration', ?)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone,
       role = 'member', role_label = excluded.role_label, active = 1, source = 'self_registration',
       updated_at = CURRENT_TIMESTAMP`
    ).bind(email, safeText(input.name, 160), safeText(input.phone, 30), requestedRoleLabel, safeText(input.reason, 1200), email).run();
    await audit(email, "portal_member_registered", "portal_user", email, { roleLabel: requestedRoleLabel });
    await notifyAdmins(
      "Nuevo registro automático en Portal FGDLL",
      `<h2>Nuevo registro automático</h2><p><strong>Nombre:</strong> ${safeText(input.name, 160)}</p><p><strong>Correo:</strong> ${email}</p><p><strong>Rol:</strong> ${requestedRoleLabel}</p><p>Este acceso quedó activo automáticamente.</p>`,
      `FGDLL: nuevo registro automático ${email}`,
    );
    return { id: "", status: "approved", contactEmail: ADMIN_CONTACT_EMAIL, autoApproved: true };
  }
  const existing = await d1().prepare(
    "SELECT id FROM access_requests WHERE requester_email = ? AND status IN ('pending','in_review','changes_requested') LIMIT 1"
  ).bind(email).first<{ id: string }>();
  if (existing) throw new PortalError(`Ya existe una solicitud pendiente con el folio ${existing.id}.`, 409);
  const id = makeFolio("ACC");
  const snapshot = requestSnapshot({ ...input, email, requestedRoleLabel, status: "pending" });
  await d1().batch([d1().prepare(
    `INSERT INTO access_requests
      (id, requester_email, requester_name, phone, requested_role, requested_role_label, zone, group_id, group_name, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, email, safeText(input.name, 160), safeText(input.phone, 30), input.requestedRole, requestedRoleLabel,
    safeText(input.zone, 60) || null, input.groupId || null, safeText(input.groupName, 160), safeText(input.reason, 1200),
  ), accessEventStatement(id, email, "submitted", "Solicitud enviada", snapshot)]);
  await audit(email, "access_requested", "access_request", id, { role: input.requestedRole, zone: input.zone, groupId: input.groupId });
  await notifyAdmins(
    `Nueva solicitud de acceso ${id}`,
    `<h2>Nueva solicitud de acceso</h2><p><strong>Folio:</strong> ${id}</p><p><strong>Nombre:</strong> ${safeText(input.name, 160)}</p><p><strong>Correo:</strong> ${email}</p><p><strong>Rol solicitado:</strong> ${requestedRoleLabel}</p><p>Revísala en <a href="https://fgdll.org/admin">fgdll.org/admin</a>.</p>`,
    `FGDLL: nueva solicitud de acceso ${id}`,
  );
  return { id, status: "pending", contactEmail: ADMIN_CONTACT_EMAIL };
}

export async function listAccessRequests(profile: PortalProfile, requesterEmail?: string, includeArchived = false) {
  const database = d1();
  if (profile.role === "admin" || profile.role === "council") {
    const result = await database.prepare(
      `SELECT ar.*, dg.name AS directory_group_name FROM access_requests ar
       LEFT JOIN directory_groups dg ON dg.id = ar.group_id
       WHERE ${includeArchived ? "1 = 1" : "ar.archived_at IS NULL"}
       ORDER BY ar.archived_at IS NOT NULL, CASE ar.status WHEN 'pending' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END, ar.created_at DESC`
    ).all<Record<string, unknown>>();
    return result.results ?? [];
  }
  const result = await database.prepare(
    `SELECT * FROM access_requests WHERE requester_email = ? ${includeArchived ? "" : "AND archived_at IS NULL"} ORDER BY archived_at IS NOT NULL, created_at DESC`
  ).bind((requesterEmail ?? profile.email).toLowerCase()).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function listOwnAccessRequests(requesterEmail: string, includeArchived = false) {
  const result = await d1().prepare(
    `SELECT ar.*, dg.name AS directory_group_name FROM access_requests ar
     LEFT JOIN directory_groups dg ON dg.id = ar.group_id
     WHERE ar.requester_email = ? ${includeArchived ? "" : "AND ar.archived_at IS NULL"} ORDER BY ar.archived_at IS NOT NULL, ar.created_at DESC`
  ).bind(requesterEmail.trim().toLowerCase()).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function listAccessRequestEvents(requestIds: string[]) {
  if (!requestIds.length) return [];
  const rows: Record<string, unknown>[] = [];
  for (let index = 0; index < requestIds.length; index += 75) {
    const requestBatch = requestIds.slice(index, index + 75);
    const placeholders = requestBatch.map(() => "?").join(", ");
    const result = await d1().prepare(
      `SELECT * FROM access_request_events WHERE request_id IN (${placeholders})`
    ).bind(...requestBatch).all<Record<string, unknown>>();
    rows.push(...(result.results ?? []));
  }
  return rows.sort((left, right) => {
    const dateOrder = String(left.created_at ?? "").localeCompare(String(right.created_at ?? ""));
    return dateOrder || Number(left.id ?? 0) - Number(right.id ?? 0);
  });
}

export async function resubmitAccessRequest(input: {
  requesterEmail: string; id: string; name: string; phone?: string; requestedRole: string;
  zone?: string; groupId?: number | null; groupName?: string; reason?: string; responseNote?: string; requestedRoleLabel?: string;
}) {
  await ensureDirectorySeeded();
  const email = normalizeEmail(input.requesterEmail);
  if (!isPortalRole(input.requestedRole) || ["admin", "director"].includes(input.requestedRole)) {
    throw new PortalError("Selecciona un tipo de acceso válido.");
  }
  const requestedRoleLabel = input.requestedRole === "member"
    ? safeText(input.requestedRoleLabel, 80) || "Guerrero de la Luz"
    : ROLE_LABELS[input.requestedRole];
  const existing = await d1().prepare(
    "SELECT id, status FROM access_requests WHERE id = ? AND requester_email = ?"
  ).bind(input.id, email).first<{ id: string; status: string }>();
  if (!existing) throw new PortalError("Solicitud no encontrada.", 404);
  if (!['pending', 'changes_requested'].includes(existing.status)) {
    throw new PortalError("Esta solicitud ya no admite correcciones.", 409);
  }

  const snapshot = requestSnapshot({
    email,
    name: safeText(input.name, 160),
    phone: safeText(input.phone, 30),
    requestedRole: input.requestedRole,
    requestedRoleLabel,
    zone: safeText(input.zone, 60),
    groupId: input.groupId ?? null,
    groupName: safeText(input.groupName, 160),
    reason: safeText(input.reason, 1200),
    status: "pending",
  });
  const result = await d1().prepare(
    `UPDATE access_requests SET requester_name = ?, phone = ?, requested_role = ?, requested_role_label = ?, zone = ?,
     group_id = ?, group_name = ?, reason = ?, status = 'pending', reviewer_email = NULL,
     review_note = '', reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND requester_email = ? AND status IN ('pending', 'changes_requested')`
  ).bind(
    snapshot.requesterName, snapshot.phone, snapshot.requestedRole, snapshot.requestedRoleLabel, snapshot.zone,
    snapshot.groupId, snapshot.groupName, snapshot.reason, input.id, email,
  ).run();
  if (!result.meta.changes) throw new PortalError("La solicitud cambió mientras la corregías. Actualiza la página.", 409);
  await accessEventStatement(
    input.id,
    email,
    existing.status === "changes_requested" ? "resubmitted" : "updated",
    safeText(input.responseNote, 1200) || "Datos corregidos y enviados nuevamente",
    snapshot,
  ).run();
  await audit(email, "access_resubmitted", "access_request", input.id, snapshot);
  return { id: input.id, status: "pending", contactEmail: ADMIN_CONTACT_EMAIL };
}

export async function reviewAccessRequest(profile: PortalProfile, input: { id: string; action: string; note?: string }) {
  if (!['admin', 'council'].includes(profile.role)) throw new PortalError("No tienes permiso para revisar accesos.", 403);
  if (!['approve', 'reject', 'request_changes'].includes(input.action)) throw new PortalError("Acción no válida.");
  if (input.action === "request_changes" && !safeText(input.note, 1000)) {
    throw new PortalError("Explica qué información debe corregir la persona.");
  }
  const request = await d1().prepare("SELECT * FROM access_requests WHERE id = ?").bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  const requestStatus = String(request.status);
  const canReconsider = profile.role === "admin" && requestStatus === "rejected" && input.action === "approve";
  if (!["pending", "in_review", "changes_requested"].includes(requestStatus) && !canReconsider) {
    throw new PortalError("Esta solicitud ya fue resuelta.", 409);
  }

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
      `INSERT INTO portal_users (email, name, phone, role, role_label, zone, group_id, active, notes, source, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'request', ?)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, role_label = excluded.role_label, zone = excluded.zone,
       phone = excluded.phone, group_id = excluded.group_id, active = 1, source = 'request',
       created_by = excluded.created_by, updated_at = CURRENT_TIMESTAMP`
    ).bind(
      request.requester_email, request.requester_name, request.phone ?? "", role, String(request.requested_role_label || "") || ROLE_LABELS[role],
      request.zone ?? null, request.group_id ?? null, safeText(input.note, 1000), profile.email,
    ));
  }
  const snapshot = {
    requesterEmail: request.requester_email,
    requesterName: request.requester_name,
    phone: request.phone,
    requestedRole: request.requested_role,
    zone: request.zone,
    groupId: request.group_id,
    groupName: request.group_name,
    reason: request.reason,
    status,
  };
  statements.push(accessEventStatement(input.id, profile.email, `review_${status}`, safeText(input.note, 1000), snapshot));
  await d1().batch(statements);
  if (status === "approved") {
    await notifyRecipients(
      [{ email: String(request.requester_email ?? ""), name: String(request.requester_name ?? ""), phone: String(request.phone ?? "") }],
      "Tu acceso al Portal FGDLL fue activado",
      `<h2>Acceso activado</h2><p>Hola ${safeText(request.requester_name, 160) || "Guerrero de la Luz"}, tu perfil del Portal FGDLL ya fue activado.</p><p>Entra a <a href="https://fgdll.org/portal">fgdll.org/portal</a>.</p>`,
      "FGDLL: tu acceso al Portal FGDLL fue activado. Entra a https://fgdll.org/portal",
    );
    const { addPendingDistributionContact } = await import("./distribution-store");
    await addPendingDistributionContact(primaryAdminEmail(), {
      email: String(request.requester_email ?? ""),
      name: String(request.requester_name ?? ""),
      phone: String(request.phone ?? ""),
      group: String(request.group_name ?? ""),
      zone: request.zone ? String(request.zone) : "",
      notes: `Solicitud aprobada: ${input.id}`,
    });
  }
  await audit(profile.email, `access_${status}`, "access_request", input.id, { note: input.note });
  return { id: input.id, status };
}

export async function archiveAccessRequest(profile: PortalProfile, input: { id: string; archived: boolean }) {
  if (!["admin", "council"].includes(profile.role)) throw new PortalError("No tienes permiso para archivar accesos.", 403);
  const request = await d1().prepare("SELECT id FROM access_requests WHERE id = ?").bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  await d1().prepare(`UPDATE access_requests SET archived_at = ${input.archived ? "CURRENT_TIMESTAMP" : "NULL"}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.id).run();
  await audit(profile.email, input.archived ? "access_archived" : "access_unarchived", "access_request", input.id, {});
  return { id: input.id, archived: input.archived };
}

export async function deleteAccessRequest(profile: PortalProfile, input: { id: string; confirmation: string }) {
  if (profile.role !== "admin") throw new PortalError("Solo administración puede eliminar solicitudes.", 403);
  const request = await d1().prepare("SELECT id, requester_name FROM access_requests WHERE id = ?").bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  if (input.confirmation !== input.id) throw new PortalError("Escribe el folio exacto para eliminar.");
  await d1().batch([
    d1().prepare("DELETE FROM access_request_events WHERE request_id = ?").bind(input.id),
    d1().prepare("DELETE FROM access_requests WHERE id = ?").bind(input.id),
  ]);
  await audit(profile.email, "access_deleted", "access_request", input.id, { requesterName: request.requester_name });
  return { id: input.id, deleted: true };
}

function requireAdministrator(profile: PortalProfile) {
  if (profile.role !== "admin") throw new PortalError("Solo administración puede gestionar usuarios manualmente.", 403);
}

export async function listPortalUsers(profile: PortalProfile) {
  requireAdministrator(profile);
  await ensureDirectorySeeded();
  const result = await d1().prepare(
    `SELECT pu.*, dg.name AS group_name, dg.zone AS group_zone
     FROM portal_users pu
     LEFT JOIN directory_groups dg ON dg.id = pu.group_id
     ORDER BY pu.active DESC, pu.name COLLATE NOCASE, pu.email COLLATE NOCASE`
  ).all<Record<string, unknown>>();
  const databaseUsers: Record<string, unknown>[] = (result.results ?? []).map((row) => ({
    ...row,
    system_managed: isAdminEmail(String(row.email ?? "")) ? 1 : 0,
  }));
  const storedEmails = new Set(databaseUsers.map((row) => String(row.email).toLowerCase()));
  const administrators = configuredAdminEmails()
    .filter((email) => !storedEmails.has(email))
    .map((email) => ({
      id: `admin:${email}`,
      email,
      name: email,
      phone: "",
      role: "admin",
      zone: null,
      group_id: null,
      center_id: null,
      group_name: "",
      active: 1,
      notes: "Cuenta administrativa configurada",
      source: "system",
      created_by: null,
      created_at: "",
      updated_at: "",
      system_managed: 1,
    }));
  return [...administrators, ...databaseUsers];
}

export async function savePortalUser(profile: PortalProfile, input: PortalUserInput) {
  requireAdministrator(profile);
  await ensureDirectorySeeded();
  const email = normalizeEmail(input.email);
  if (isAdminEmail(email)) {
    throw new PortalError("Las cuentas administrativas principales se gestionan desde la configuración institucional.");
  }

  const requestedRole = safeText(input.role, 40) || "pending";
  if (requestedRole === "admin" || (requestedRole !== "pending" && !isPortalRole(requestedRole))) {
    throw new PortalError("Selecciona un perfil válido.");
  }
  const role = requestedRole as PortalRole | "pending";
  const roleText = role === "member" ? safeText(input.roleLabel, 80) || "Guerrero de la Luz" : role === "pending" ? "" : ROLE_LABELS[role];
  const groupId = input.groupId && Number.isInteger(Number(input.groupId)) ? Number(input.groupId) : null;
  const centerId = input.centerId && Number.isInteger(Number(input.centerId)) ? Number(input.centerId) : null;
  const group = groupId ? await getDirectoryGroup(groupId) : null;
  if (groupId && !group) throw new PortalError("El grupo seleccionado no existe.");
  const zone = group?.zone || safeText(input.zone, 60) || null;
  const active = Boolean(input.active);
  if (active && role === "pending") throw new PortalError("Asigna un perfil antes de activar el acceso.");
  if (active && (role === "leader" || role === "osg") && !groupId) {
    throw new PortalError("Para activar a un líder u OSG debes asignar su grupo.");
  }
  if (active && role === "delegate" && !zone) {
    throw new PortalError("Para activar a un delegado debes asignar su zona.");
  }

  const name = safeText(input.name, 160);
  const phone = safeText(input.phone, 30);
  const notes = safeText(input.notes, 1200);
  await d1().prepare(
    `INSERT INTO portal_users
      (email, name, phone, role, role_label, zone, group_id, center_id, active, notes, source, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone,
     role = excluded.role, role_label = excluded.role_label, zone = excluded.zone, group_id = excluded.group_id, center_id = excluded.center_id,
     active = excluded.active, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP`
  ).bind(email, name, phone, role, roleText, zone, groupId, centerId, active ? 1 : 0, notes, profile.email).run();
  if (active) {
    const openRequest = await d1().prepare(
      "SELECT * FROM access_requests WHERE requester_email = ? AND status IN ('pending', 'in_review', 'changes_requested') ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first<Record<string, unknown>>();
    if (openRequest) {
      const requestId = String(openRequest.id);
      const resolutionNote = notes || "Alta manual realizada por administración";
      await d1().batch([
        d1().prepare(
          `UPDATE access_requests SET status = 'approved', reviewer_email = ?, review_note = ?,
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(profile.email, resolutionNote, requestId),
        accessEventStatement(requestId, profile.email, "review_approved", resolutionNote, {
          requesterEmail: email, requesterName: name, phone, requestedRole: role,
          zone, groupId, status: "approved", resolution: "manual_activation",
        }),
      ]);
    }
  }
  await audit(profile.email, "portal_user_saved", "portal_user", email, {
    name, phone, role, zone, groupId, centerId, active, notes,
  });
  if (active) {
    await notifyRecipients(
      [{ email, name, phone }],
      "Tu acceso al Portal FGDLL fue activado",
      `<h2>Acceso activado</h2><p>${name || email}, tu acceso al Portal FGDLL ya está activo.</p><p>Entra a <a href="https://fgdll.org/portal">fgdll.org/portal</a>.</p>`,
      "FGDLL: tu acceso al Portal FGDLL fue activado. Entra a https://fgdll.org/portal",
    );
  }
  return { email, role, zone, groupId, centerId, active };
}

export async function deleteDirectoryGroup(profile: PortalProfile, input: { id: number; confirmation: string }) {
  requireAdministrator(profile);
  const group = await getDirectoryGroup(input.id);
  if (!group) throw new PortalError("El grupo ya no existe.", 404);
  if (safeText(input.confirmation, 200) !== group.name) {
    throw new PortalError("Escribe el nombre exacto del grupo para confirmar el borrado.");
  }
  const linkedUsers = await d1().prepare(
    "SELECT COUNT(*) AS total FROM portal_users WHERE group_id = ?"
  ).bind(group.id).first<{ total: number }>();
  const linkedRequests = await d1().prepare(
    "SELECT COUNT(*) AS total FROM access_requests WHERE group_id = ?"
  ).bind(group.id).first<{ total: number }>();
  const linkedChanges = await d1().prepare(
    "SELECT COUNT(*) AS total FROM directory_change_requests WHERE group_id = ?"
  ).bind(group.id).first<{ total: number }>();
  const details = {
    group,
    affectedUsers: Number(linkedUsers?.total ?? 0),
    preservedAccessRequests: Number(linkedRequests?.total ?? 0),
    removedChangeRequests: Number(linkedChanges?.total ?? 0),
  };
  await d1().batch([
    d1().prepare("DELETE FROM directory_change_requests WHERE group_id = ?").bind(group.id),
    d1().prepare("UPDATE access_requests SET group_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE group_id = ?").bind(group.id),
    d1().prepare(
      `UPDATE portal_users SET group_id = NULL,
       active = CASE WHEN role IN ('leader', 'osg') THEN 0 ELSE active END,
       notes = CASE WHEN role IN ('leader', 'osg')
         THEN TRIM(notes || ?)
         ELSE notes END,
       updated_at = CURRENT_TIMESTAMP WHERE group_id = ?`
    ).bind(` · Acceso desactivado al borrar el grupo ${group.name}`, group.id),
    d1().prepare("DELETE FROM directory_groups WHERE id = ?").bind(group.id),
    d1().prepare(
      "INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'directory_group_deleted', 'directory_group', ?, ?)"
    ).bind(profile.email, String(group.id), JSON.stringify(details)),
  ]);
  return { id: group.id, name: group.name, deleted: true, ...details };
}

async function applyGroupUpdate(group: DirectoryGroup, proposal: Partial<Record<EditableGroupField, string>>, actorEmail: string) {
  const changed = changedFields(group, proposal);
  if (!changed.length) throw new PortalError("No hay cambios para guardar.");
  const columnMap: Record<EditableGroupField, string> = {
    zone: "zone", name: "name", city: "city", leaderName: "leader_name", subleaderName: "subleader_name",
    whatsapp: "whatsapp", email: "email", facebook: "facebook", address: "address", mapsUrl: "maps_url",
    schedules: "schedules", sessionTypes: "session_types", status: "status",
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

export async function listDirectoryChanges(profile: PortalProfile, includeArchived = false) {
  let where = "1 = 1";
  const values: unknown[] = [];
  if (profile.role === "delegate") { where = "dg.zone = ?"; values.push(profile.zone); }
  else if (profile.role === "leader" || profile.role === "osg" || profile.role === "member") { where = "dcr.requester_email = ?"; values.push(profile.email); }
  if (!includeArchived) where = `(${where}) AND dcr.archived_at IS NULL`;
  const result = await d1().prepare(
    `SELECT dcr.*, dg.name AS group_name, dg.zone AS group_zone
     FROM directory_change_requests dcr JOIN directory_groups dg ON dg.id = dcr.group_id
     WHERE ${where}
     ORDER BY dcr.archived_at IS NOT NULL, CASE dcr.status WHEN 'pending' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END, dcr.created_at DESC`
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

export async function archiveDirectoryChange(profile: PortalProfile, input: { id: string; archived: boolean }) {
  if (!["admin", "council", "delegate"].includes(profile.role)) throw new PortalError("No tienes permiso para archivar cambios.", 403);
  const request = await d1().prepare(
    `SELECT dcr.id, dg.zone AS group_zone FROM directory_change_requests dcr
     JOIN directory_groups dg ON dg.id = dcr.group_id WHERE dcr.id = ?`
  ).bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  if (profile.role === "delegate" && profile.zone !== request.group_zone) throw new PortalError("Esta solicitud pertenece a otra zona.", 403);
  await d1().prepare(`UPDATE directory_change_requests SET archived_at = ${input.archived ? "CURRENT_TIMESTAMP" : "NULL"}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.id).run();
  await audit(profile.email, input.archived ? "directory_change_archived" : "directory_change_unarchived", "directory_change_request", input.id, {});
  return { id: input.id, archived: input.archived };
}

export async function deleteDirectoryChange(profile: PortalProfile, input: { id: string; confirmation: string }) {
  if (profile.role !== "admin") throw new PortalError("Solo administración puede eliminar solicitudes.", 403);
  const request = await d1().prepare("SELECT id FROM directory_change_requests WHERE id = ?").bind(input.id).first<Record<string, unknown>>();
  if (!request) throw new PortalError("Solicitud no encontrada.", 404);
  if (input.confirmation !== input.id) throw new PortalError("Escribe el folio exacto para eliminar.");
  await d1().prepare("DELETE FROM directory_change_requests WHERE id = ?").bind(input.id).run();
  await audit(profile.email, "directory_change_deleted", "directory_change_request", input.id, {});
  return { id: input.id, deleted: true };
}

export async function dashboardStats(profile: PortalProfile) {
  const groups = await groupsForProfile(profile);
  const changes = await listDirectoryChanges(profile);
  const access = profile.role === "admin" || profile.role === "council" ? await listAccessRequests(profile) : [];
  return {
    groups: groups.length,
    verified: groups.filter((group) => Boolean(group.verifiedAt)).length,
    unverified: groups.filter((group) => !group.verifiedAt).length,
    pendingChanges: changes.filter((item: Record<string, unknown>) => item.status === "pending").length,
    pendingAccess: access.filter((item: Record<string, unknown>) =>
      ["pending", "in_review", "changes_requested"].includes(String(item.status)),
    ).length,
  };
}
