import "server-only";

import { getRuntimeEnv } from "./runtime-env";
import { PortalError, type PortalProfile } from "./directory-store";

const VERSIONS = new Set(["2022", "2025", "2026"]);
const PARTICIPANT_TYPES = new Set(["participant", "center_director"]);
const USER_STATUSES = new Set(["active", "paused", "completed", "archived"]);
const REQUEST_STATUSES = new Set(["received", "in_review", "approved", "changes_requested", "closed"]);
const CERTIFICATE_STATUSES = new Set(["pending_validation", "in_review", "approved", "ready", "delivered", "closed"]);
const PAYMENT_STATUSES = new Set(["total", "partial", "pending"]);
const REQUEST_TYPES = new Set(["printing", "reprinting"]);

function db() {
  const value = getRuntimeEnv().DB;
  if (!value) throw new PortalError("Universidad FGDLL no está disponible en este momento.", 503);
  return value;
}

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function email(value: unknown) {
  const normalized = clean(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new PortalError("Escribe un correo electrónico válido.");
  return normalized;
}

function phone(value: unknown) {
  const normalized = clean(value, 30).replace(/[^\d+]/g, "").slice(0, 18);
  if (normalized.replace(/\D/g, "").length < 10) throw new PortalError("Escribe un número de contacto válido.");
  return normalized;
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin") throw new PortalError("Solo Administración puede gestionar Universidad FGDLL.", 403);
}

function version(value: unknown) {
  const result = clean(value, 10);
  if (!VERSIONS.has(result)) throw new PortalError("Selecciona una generación válida.");
  return result;
}

async function audit(actorEmail: string, action: string, targetId: string, details: unknown) {
  await db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, 'university', ?, ?)")
    .bind(actorEmail, action, targetId, JSON.stringify(details)).run();
}

export async function registerUniversityUser(input: Record<string, unknown>, actorEmail = "public-form", source = "self_registration") {
  const userEmail = email(input.email);
  const fullName = clean(input.fullName, 180) || (source === "admin_manual" ? userEmail.split("@")[0] : "");
  const mobilePhone = source === "admin_manual" && !clean(input.mobilePhone) ? "" : phone(input.mobilePhone);
  const organization = clean(input.organization, 180);
  const diplomaVersion = version(input.diplomaVersion);
  const participantType = PARTICIPANT_TYPES.has(String(input.participantType)) ? String(input.participantType) : "participant";
  if (!fullName) throw new PortalError("Escribe el nombre completo.");
  if (source !== "admin_manual" && !organization) throw new PortalError("Escribe el grupo o centro.");
  const existing = await db().prepare("SELECT id, status FROM university_users WHERE email = ?").bind(userEmail).first<Record<string, unknown>>();
  if (existing) throw new PortalError("Este correo ya está registrado en Universidad FGDLL.", 409);
  const result = await db().prepare(`INSERT INTO university_users
    (email, full_name, mobile_phone, organization, participant_type, diploma_version, status, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
    .bind(userEmail, fullName, mobilePhone, organization, participantType, diplomaVersion, source, actorEmail).run();
  await audit(actorEmail, "university_user_created", userEmail, { source, diplomaVersion, participantType });
  return { ok: true, id: Number(result.meta.last_row_id), email: userEmail };
}

export async function registerCenterBatch(input: Record<string, unknown>) {
  const directorEmail = email(input.directorEmail);
  const mobilePhone = phone(input.mobilePhone);
  const centerName = clean(input.centerName, 180);
  const diplomaVersion = version(input.diplomaVersion);
  const participantNames = clean(input.participantNames, 6000).split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 100);
  if (!centerName) throw new PortalError("Escribe el nombre del centro.");
  if (!participantNames.length) throw new PortalError("Agrega al menos un participante, uno por línea.");
  const id = `UNI-CEN-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await db().prepare(`INSERT INTO university_center_batches
    (id, director_email, mobile_phone, center_name, diploma_version, participant_names_json, participant_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, directorEmail, mobilePhone, centerName, diplomaVersion, JSON.stringify(participantNames), participantNames.length).run();
  await audit("public-center-form", "university_center_batch_created", id, { centerName, diplomaVersion, participantCount: participantNames.length });
  return { ok: true, id, participantCount: participantNames.length };
}

export async function requestCertificate(input: Record<string, unknown>) {
  const fullName = clean(input.fullName, 180);
  const mobilePhone = phone(input.mobilePhone);
  const groupName = clean(input.groupName, 180);
  const diplomaVersion = version(input.diplomaVersion);
  const paymentStatus = clean(input.paymentStatus, 20);
  const requestType = clean(input.requestType, 20);
  if (!fullName) throw new PortalError("Escribe el nombre completo.");
  if (!groupName) throw new PortalError("Escribe el grupo o centro.");
  if (!PAYMENT_STATUSES.has(paymentStatus)) throw new PortalError("Indica el estado del pago del diplomado.");
  if (!REQUEST_TYPES.has(requestType)) throw new PortalError("Selecciona impresión o reimpresión.");
  const id = `UNI-REC-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await db().prepare(`INSERT INTO university_certificate_requests
    (id, full_name, mobile_phone, group_name, diploma_version, payment_status, request_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, fullName, mobilePhone, groupName, diplomaVersion, paymentStatus, requestType).run();
  await audit("public-certificate-form", "university_certificate_requested", id, { diplomaVersion, paymentStatus, requestType });
  return { ok: true, id };
}

export async function listUniversityAdmin(profile: PortalProfile) {
  requireAdmin(profile);
  const [users, centerBatches, certificateRequests] = await Promise.all([
    db().prepare("SELECT * FROM university_users ORDER BY created_at DESC LIMIT 500").all<Record<string, unknown>>(),
    db().prepare("SELECT * FROM university_center_batches ORDER BY created_at DESC LIMIT 250").all<Record<string, unknown>>(),
    db().prepare("SELECT * FROM university_certificate_requests ORDER BY created_at DESC LIMIT 250").all<Record<string, unknown>>(),
  ]);
  return { users: users.results ?? [], centerBatches: centerBatches.results ?? [], certificateRequests: certificateRequests.results ?? [] };
}

export async function addUniversityUser(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  return registerUniversityUser(input, profile.email, "admin_manual");
}

export async function updateUniversityRecord(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const kind = clean(input.kind, 30);
  const id = clean(input.id, 80);
  const status = clean(input.status, 30);
  const adminNotes = clean(input.adminNotes, 3000);
  if (!id) throw new PortalError("Selecciona un registro válido.");
  let table: string;
  let allowed: Set<string>;
  if (kind === "user") { table = "university_users"; allowed = USER_STATUSES; }
  else if (kind === "center") { table = "university_center_batches"; allowed = REQUEST_STATUSES; }
  else if (kind === "certificate") { table = "university_certificate_requests"; allowed = CERTIFICATE_STATUSES; }
  else throw new PortalError("El tipo de registro no es válido.");
  if (!allowed.has(status)) throw new PortalError("Selecciona un estado válido.");
  const idColumn = kind === "user" ? "id" : "id";
  const sql = kind === "certificate"
    ? `UPDATE ${table} SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE ${idColumn} = ?`
    : `UPDATE ${table} SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = ?`;
  const result = kind === "certificate"
    ? await db().prepare(sql).bind(status, adminNotes, profile.email, id).run()
    : await db().prepare(sql).bind(status, id).run();
  if (!result.meta.changes) throw new PortalError("El registro no existe.", 404);
  await audit(profile.email, "university_record_updated", id, { kind, status, notesChanged: Boolean(adminNotes) });
  return { ok: true, kind, id, status };
}
