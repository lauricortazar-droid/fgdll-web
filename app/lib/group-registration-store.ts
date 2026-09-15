import "server-only";

import { ensureDirectorySeeded, PortalError, sanitizeProposal, type PortalProfile } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";
import { notifyAdmins, notifyRecipients } from "./notification-store";

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos del portal no está disponible.", 503);
  return database;
}

function safeText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function makeFolio() {
  return `GRP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function canReview(profile: PortalProfile, zone: string, requesterEmail: string) {
  if (profile.email === requesterEmail) return false;
  if (profile.role === "admin" || profile.role === "council") return true;
  return profile.role === "delegate" && profile.zone === zone;
}

function validateProposal(payload: Record<string, unknown>) {
  const proposal = sanitizeProposal(payload);
  if (!proposal.zone || !proposal.name || !proposal.city || !proposal.leaderName || !proposal.whatsapp || !proposal.address || !proposal.schedules) {
    throw new PortalError("Completa zona, nombre, ciudad, líder, WhatsApp, dirección y horarios.");
  }
  proposal.status = "active";
  return proposal;
}

export async function listGroupRegistrations(profile: PortalProfile) {
  await ensureDirectorySeeded();
  let query = "SELECT * FROM group_registration_requests";
  const values: unknown[] = [];
  if (profile.role === "delegate") { query += " WHERE zone = ? OR requester_email = ?"; values.push(profile.zone ?? "", profile.email); }
  else if (!['admin', 'council'].includes(profile.role)) { query += " WHERE requester_email = ?"; values.push(profile.email); }
  query += " ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'changes_requested' THEN 1 WHEN 'in_review' THEN 2 ELSE 3 END, created_at DESC";
  const result = await db().prepare(query).bind(...values).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function submitGroupRegistration(profile: PortalProfile, payload: Record<string, unknown>, note: unknown) {
  await ensureDirectorySeeded();
  const proposal = validateProposal(payload);
  const existing = await db().prepare(
    "SELECT id FROM group_registration_requests WHERE requester_email = ? AND status IN ('pending', 'in_review', 'changes_requested') LIMIT 1"
  ).bind(profile.email).first<{ id: string }>();
  if (existing) throw new PortalError(`Ya tienes una solicitud abierta con el folio ${existing.id}.`, 409);
  const duplicate = await db().prepare(
    "SELECT id FROM directory_groups WHERE zone = ? AND name = ? COLLATE NOCASE AND city = ? COLLATE NOCASE LIMIT 1"
  ).bind(proposal.zone, proposal.name, proposal.city).first<{ id: number }>();
  if (duplicate) throw new PortalError("Ya existe un grupo con ese nombre y ciudad en la zona seleccionada.", 409);
  const id = makeFolio();
  await db().batch([
    db().prepare(`INSERT INTO group_registration_requests
      (id, requester_email, requester_name, requester_role, zone, proposed_json, requester_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, profile.email, profile.name, profile.role, proposal.zone, JSON.stringify(proposal), safeText(note, 1200)),
    db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'group_registration_submitted', 'group_registration', ?, ?)")
      .bind(profile.email, id, JSON.stringify({ zone: proposal.zone, name: proposal.name })),
  ]);
  await notifyAdmins(
    `Nuevo registro de grupo ${id}`,
    `<h2>Nuevo registro de grupo</h2><p><strong>Folio:</strong> ${id}</p><p><strong>Grupo:</strong> ${proposal.name}</p><p><strong>Zona:</strong> ${proposal.zone}</p><p><strong>Solicita:</strong> ${profile.name} (${profile.email})</p><p>Revísalo en <a href="https://fgdll.org/admin/registrar-grupo#revision">fgdll.org/admin</a>.</p>`,
    `FGDLL: nuevo registro de grupo ${id}`,
  );
  return { ok: true, id };
}

export async function resubmitGroupRegistration(profile: PortalProfile, id: string, payload: Record<string, unknown>, note: unknown) {
  const row = await db().prepare("SELECT requester_email, status FROM group_registration_requests WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("La solicitud no existe.", 404);
  if (String(row.requester_email) !== profile.email) throw new PortalError("No puedes corregir esta solicitud.", 403);
  if (String(row.status) !== "changes_requested") throw new PortalError("Esta solicitud no está esperando correcciones.");
  const proposal = validateProposal(payload);
  await db().batch([
    db().prepare(`UPDATE group_registration_requests SET zone = ?, proposed_json = ?, requester_note = ?, status = 'pending',
      reviewer_email = NULL, review_note = '', reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(proposal.zone, JSON.stringify(proposal), safeText(note, 1200), id),
    db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'group_registration_resubmitted', 'group_registration', ?, ?)")
      .bind(profile.email, id, JSON.stringify({ zone: proposal.zone, name: proposal.name })),
  ]);
  return { ok: true, id };
}

export async function reviewGroupRegistration(profile: PortalProfile, id: string, action: string, note: unknown) {
  const row = await db().prepare("SELECT * FROM group_registration_requests WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("La solicitud no existe.", 404);
  const status = String(row.status);
  const zone = String(row.zone);
  const requesterEmail = String(row.requester_email);
  if (!canReview(profile, zone, requesterEmail)) throw new PortalError("No tienes facultad para resolver esta solicitud.", 403);
  if (!['pending', 'in_review', 'changes_requested'].includes(status)) throw new PortalError("La solicitud ya fue resuelta.");
  if (!['approve', 'request_changes', 'reject'].includes(action)) throw new PortalError("Selecciona una resolución válida.");
  const reviewNote = safeText(note, 1200);
  if (action !== 'approve' && !reviewNote) throw new PortalError("Explica la corrección o el motivo de la resolución.");

  if (action === 'request_changes' || action === 'reject') {
    const nextStatus = action === 'request_changes' ? 'changes_requested' : 'rejected';
    await db().batch([
      db().prepare("UPDATE group_registration_requests SET status = ?, reviewer_email = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(nextStatus, profile.email, reviewNote, id),
      db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, 'group_registration', ?, ?)")
        .bind(profile.email, `group_registration_${nextStatus}`, id, JSON.stringify({ note: reviewNote })),
    ]);
    return { ok: true, status: nextStatus };
  }

  const proposal = validateProposal(JSON.parse(String(row.proposed_json ?? '{}')) as Record<string, unknown>);
  const duplicate = await db().prepare("SELECT id FROM directory_groups WHERE zone = ? AND name = ? COLLATE NOCASE AND city = ? COLLATE NOCASE LIMIT 1")
    .bind(proposal.zone, proposal.name, proposal.city).first<{ id: number }>();
  if (duplicate) throw new PortalError("El grupo ya existe en el directorio. Revisa antes de aprobar.", 409);
  await db().prepare(`INSERT INTO directory_groups
    (zone, name, city, leader_name, subleader_name, whatsapp, email, facebook, address, maps_url, schedules, session_types, status, verified_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, ?)`
  ).bind(proposal.zone, proposal.name, proposal.city, proposal.leaderName, proposal.subleaderName ?? "", proposal.whatsapp, proposal.email ?? "", proposal.facebook ?? "", proposal.address, proposal.mapsUrl ?? "", proposal.schedules, proposal.sessionTypes ?? "", profile.email).run();
  const group = await db().prepare("SELECT id FROM directory_groups WHERE zone = ? AND name = ? COLLATE NOCASE AND city = ? COLLATE NOCASE LIMIT 1")
    .bind(proposal.zone, proposal.name, proposal.city).first<{ id: number }>();
  if (!group) throw new PortalError("El grupo fue validado, pero no se pudo recuperar su registro.", 500);
  await db().batch([
    db().prepare("UPDATE group_registration_requests SET status = 'approved', reviewer_email = ?, review_note = ?, created_group_id = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(profile.email, reviewNote, group.id, id),
    db().prepare("UPDATE portal_users SET group_id = ?, zone = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ? AND role IN ('leader', 'osg') AND group_id IS NULL")
      .bind(group.id, proposal.zone, requesterEmail),
    db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'group_registration_approved', 'directory_group', ?, ?)")
      .bind(profile.email, String(group.id), JSON.stringify({ requestId: id, requesterEmail })),
  ]);
  await notifyRecipients(
    [{ email: requesterEmail, name: String(row.requester_name ?? ""), phone: "" }],
    "Tu grupo fue aprobado en FGDLL",
    `<h2>Grupo aprobado</h2><p>Tu solicitud de grupo <strong>${proposal.name}</strong> fue aprobada y agregada al directorio.</p><p>Entra al portal: <a href="https://fgdll.org/portal">fgdll.org/portal</a>.</p>`,
    `FGDLL: tu grupo ${proposal.name} fue aprobado.`,
  );
  return { ok: true, status: 'approved', groupId: group.id };
}
