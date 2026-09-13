import "server-only";

import { getRuntimeEnv } from "./runtime-env";
import { isAdminEmail, PortalError, type PortalProfile } from "./directory-store";

const CATEGORIES = new Set(["autoridad", "integridad", "finanzas", "anonimato", "limites"]);
const SUPPORT = new Set(["Orientación", "Protección inmediata", "Revisión institucional", "Mediación"]);
const CONTACT_METHODS = new Set(["none", "whatsapp", "phone", "email"]);
const STATUSES = new Set(["received", "screening", "investigation", "resolution", "closed"]);
const SEVERITIES = new Set(["unclassified", "low", "medium", "high", "critical"]);
const TRACKING_KEY_LENGTH = 12;

function database() {
  const value = getRuntimeEnv().DB;
  if (!value) throw new PortalError("El canal de ética no está disponible en este momento.", 503);
  return value;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email)) {
    throw new PortalError("Solo Administración puede gestionar los reportes de ética.", 403);
  }
}

function randomDigits(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String(byte % 10)).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function submitEthicsReport(input: Record<string, unknown>) {
  if (clean(input.website, 120)) throw new PortalError("No fue posible registrar el reporte.");
  const category = clean(input.category, 30);
  const groupZone = clean(input.groupZone, 180);
  const approximateDate = clean(input.approximateDate, 20);
  const narrative = clean(input.narrative, 10000);
  const peopleOrWitnesses = clean(input.peopleOrWitnesses, 3000);
  const supportNeeded = clean(input.supportNeeded, 60);
  const contactMethod = clean(input.contactMethod, 20) || "none";
  const safeContact = clean(input.safeContact, 254);
  const consent = input.consent === true;

  if (!CATEGORIES.has(category)) throw new PortalError("Selecciona una categoría válida.");
  if (narrative.length < 30) throw new PortalError("Describe los hechos con al menos 30 caracteres.");
  if (!SUPPORT.has(supportNeeded)) throw new PortalError("Selecciona el apoyo que necesitas.");
  if (!CONTACT_METHODS.has(contactMethod)) throw new PortalError("Selecciona una forma de contacto válida.");
  if (contactMethod !== "none" && !safeContact) throw new PortalError("Escribe un dato de contacto seguro.");
  if (contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeContact)) {
    throw new PortalError("Escribe un correo electrónico válido.");
  }
  if ((contactMethod === "phone" || contactMethod === "whatsapp") && safeContact.replace(/\D/g, "").length < 10) {
    throw new PortalError("Escribe un número de contacto válido.");
  }
  if (!consent) throw new PortalError("Debes aceptar el tratamiento de la información para enviar el reporte.");

  const publicFolio = randomDigits(16);
  const trackingKey = randomDigits(TRACKING_KEY_LENGTH);
  const trackingSecretHash = await sha256(trackingKey);
  const db = database();
  await db.batch([
    db.prepare(`INSERT INTO ethics_reports
      (public_folio, tracking_secret_hash, category, group_zone, approximate_date, narrative, people_or_witnesses, support_needed, contact_method, safe_contact, consent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(publicFolio, trackingSecretHash, category, groupZone, approximateDate, narrative, peopleOrWitnesses, supportNeeded, contactMethod, safeContact),
    db.prepare(`INSERT INTO ethics_report_events
      (report_id, event_type, status, public_message, actor_email)
      SELECT id, 'received', 'received', 'Tu reporte fue recibido y quedó registrado para evaluación inicial.', 'system'
      FROM ethics_reports WHERE public_folio = ?`)
      .bind(publicFolio),
  ]);
  return { ok: true, publicFolio, trackingKey };
}

export async function trackEthicsReport(input: Record<string, unknown>) {
  const publicFolio = clean(input.publicFolio, 32).replace(/\D/g, "");
  const trackingKey = clean(input.trackingKey, 32).replace(/\D/g, "");
  if (publicFolio.length !== 16 || trackingKey.length !== TRACKING_KEY_LENGTH) {
    throw new PortalError("El folio o la clave de seguimiento no son válidos.", 404);
  }
  const hash = await sha256(trackingKey);
  const report = await database().prepare(`SELECT id, public_folio, category, support_needed, status, created_at, updated_at
    FROM ethics_reports WHERE public_folio = ? AND tracking_secret_hash = ?`)
    .bind(publicFolio, hash).first<Record<string, unknown>>();
  if (!report) throw new PortalError("El folio o la clave de seguimiento no son válidos.", 404);
  const events = await database().prepare(`SELECT status, public_message, created_at FROM ethics_report_events
    WHERE report_id = ? AND public_message <> '' ORDER BY created_at ASC, id ASC`)
    .bind(report.id).all<Record<string, unknown>>();
  return { report, events: events.results ?? [] };
}

export async function listEthicsReports(profile: PortalProfile) {
  requireAdmin(profile);
  const [reports, events] = await Promise.all([
    database().prepare(`SELECT id, public_folio, category, group_zone, approximate_date, narrative,
      people_or_witnesses, support_needed, contact_method, safe_contact, status, severity, created_at, updated_at
      FROM ethics_reports ORDER BY created_at DESC LIMIT 250`).all<Record<string, unknown>>(),
    database().prepare(`SELECT id, report_id, event_type, status, public_message, private_note, actor_email, created_at
      FROM ethics_report_events ORDER BY created_at ASC, id ASC`).all<Record<string, unknown>>(),
  ]);
  return { reports: reports.results ?? [], events: events.results ?? [] };
}

export async function updateEthicsReport(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const id = Number(input.id);
  const status = clean(input.status, 30);
  const severity = clean(input.severity, 30);
  const publicMessage = clean(input.publicMessage, 2000);
  const privateNote = clean(input.privateNote, 4000);
  if (!Number.isInteger(id) || id < 1) throw new PortalError("El reporte no es válido.");
  if (!STATUSES.has(status)) throw new PortalError("Selecciona un estado válido.");
  if (!SEVERITIES.has(severity)) throw new PortalError("Selecciona una prioridad válida.");
  const current = await database().prepare("SELECT status, severity, public_folio FROM ethics_reports WHERE id = ?")
    .bind(id).first<Record<string, unknown>>();
  if (!current) throw new PortalError("El reporte no existe.", 404);
  await database().prepare("UPDATE ethics_reports SET status = ?, severity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, severity, id).run();
  await database().prepare(`INSERT INTO ethics_report_events
    (report_id, event_type, status, public_message, private_note, actor_email)
    VALUES (?, 'admin_update', ?, ?, ?, ?)`)
    .bind(id, status, publicMessage, privateNote, profile.email).run();
  await database().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'ethics_report_updated', 'ethics_report', ?, ?)")
    .bind(profile.email, String(current.public_folio), JSON.stringify({ fromStatus: current.status, toStatus: status, fromSeverity: current.severity, toSeverity: severity, publicUpdate: Boolean(publicMessage), privateNote: Boolean(privateNote) })).run();
  return { ok: true, id, status, severity };
}
