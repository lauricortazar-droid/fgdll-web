import "server-only";

import { getRuntimeEnv } from "./runtime-env";
import {
  isAdminEmail,
  PortalError,
  type PortalProfile,
} from "./directory-store";
import { notifyAdmins as notifyConfiguredAdmins } from "./notification-store";

const STATUSES = new Set([
  "new",
  "contacted",
  "oriented",
  "referred",
  "closed",
]);
const AGE_GROUPS = new Set(["minor", "adult", "unknown"]);
const HELP_TYPES = new Set(["group", "family", "residential", "unsure"]);
const DANGER_OPTIONS = new Set(["yes", "no", "unsure"]);

function db() {
  const database = getRuntimeEnv().DB;
  if (!database)
    throw new PortalError(
      "La orientación no está disponible en este momento.",
      503,
    );
  return database;
}

function clean(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] || character,
  );
}

function phone(value: unknown) {
  return clean(value, 30)
    .replace(/[^\d+]/g, "")
    .slice(0, 18);
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email))
    throw new PortalError(
      "Solo Administración puede consultar estas solicitudes.",
      403,
    );
}

async function notifyAdmins(
  id: string,
  name: string,
  city: string,
  danger: string,
) {
  try {
    return await notifyConfiguredAdmins(
      `Nueva solicitud de orientación ${id}`,
      `<h2>Nueva solicitud de orientación</h2><p><strong>Folio:</strong> ${escapeHtml(id)}</p><p><strong>Solicita:</strong> ${escapeHtml(name)}</p><p><strong>Ciudad:</strong> ${escapeHtml(city || "No indicada")}</p><p><strong>Peligro inmediato:</strong> ${escapeHtml(danger)}</p><p>Consulta los datos protegidos dentro de Administración del Portal FGDLL.</p>`,
      `FGDLL: nueva solicitud de orientación ${id}`,
    );
  } catch (error) {
    console.error(
      "No fue posible enviar la notificación de orientación",
      error,
    );
    return { sent: false, reason: "email_failed" };
  }
}

export async function submitOrientationRequest(input: Record<string, unknown>) {
  if (clean(input.website, 120))
    throw new PortalError("No fue posible registrar la solicitud.");
  const requesterName = clean(input.requesterName, 120);
  const whatsapp = phone(input.whatsapp);
  const city = clean(input.city, 120);
  const relationship = clean(input.relationship, 120);
  const ageGroup = AGE_GROUPS.has(String(input.ageGroup))
    ? String(input.ageGroup)
    : "unknown";
  const helpType = HELP_TYPES.has(String(input.helpType))
    ? String(input.helpType)
    : "unsure";
  const danger = DANGER_OPTIONS.has(String(input.danger))
    ? String(input.danger)
    : "unsure";
  const preferredTime = clean(input.preferredTime, 120);
  const consentContact = input.consentContact === true;
  const consentPrivacy = input.consentPrivacy === true;
  if (!requesterName) throw new PortalError("Escribe tu nombre.");
  if (whatsapp.replace(/\D/g, "").length < 10)
    throw new PortalError("Escribe un número de WhatsApp válido.");
  if (!relationship)
    throw new PortalError(
      "Indica tu relación con la persona que necesita ayuda.",
    );
  if (!consentContact || !consentPrivacy)
    throw new PortalError(
      "Necesitamos tu autorización de contacto y aceptación del aviso de privacidad.",
    );
  const id = `ORI-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await db()
    .prepare(
      `INSERT INTO orientation_requests
    (id, requester_name, whatsapp, city, relationship, age_group, help_type, danger, preferred_time, consent_contact, consent_privacy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    )
    .bind(
      id,
      requesterName,
      whatsapp,
      city,
      relationship,
      ageGroup,
      helpType,
      danger,
      preferredTime,
    )
    .run();
  await db()
    .prepare(
      "INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES ('public-orientation-form', 'orientation_requested', 'orientation_request', ?, ?)",
    )
    .bind(
      id,
      JSON.stringify({ city, relationship, ageGroup, helpType, danger }),
    )
    .run();
  const email = await notifyAdmins(id, requesterName, city, danger);
  return { ok: true, id, email };
}

export async function listOrientationRequests(profile: PortalProfile) {
  requireAdmin(profile);
  const [requests, centers] = await Promise.all([
    db()
      .prepare(
        `SELECT o.*, c.name AS assigned_center_name FROM orientation_requests o
      LEFT JOIN rehabilitation_centers c ON c.id = o.assigned_center_id
      ORDER BY CASE o.status WHEN 'new' THEN 0 WHEN 'contacted' THEN 1 WHEN 'oriented' THEN 2 WHEN 'referred' THEN 3 ELSE 4 END, o.created_at DESC`,
      )
      .all<Record<string, unknown>>(),
    db()
      .prepare(
        "SELECT id, name, city FROM rehabilitation_centers WHERE status = 'published' ORDER BY name",
      )
      .all<Record<string, unknown>>(),
  ]);
  return { requests: requests.results ?? [], centers: centers.results ?? [] };
}

export async function updateOrientationRequest(
  profile: PortalProfile,
  input: Record<string, unknown>,
) {
  requireAdmin(profile);
  const id = clean(input.id, 40);
  const status = clean(input.status, 20);
  if (!STATUSES.has(status))
    throw new PortalError("Selecciona un estado válido.");
  const adminNotes = clean(input.adminNotes, 3000);
  const assignedCenterId = Number(input.assignedCenterId || 0) || null;
  const current = await db()
    .prepare(
      "SELECT status, assigned_center_id, admin_notes FROM orientation_requests WHERE id = ?",
    )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!current) throw new PortalError("La solicitud no existe.", 404);
  const result = await db()
    .prepare(
      "UPDATE orientation_requests SET status = ?, assigned_center_id = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?",
    )
    .bind(status, assignedCenterId, adminNotes, profile.email, id)
    .run();
  if (!result.meta.changes)
    throw new PortalError("No fue posible actualizar la solicitud.");
  await db()
    .prepare(
      "INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'orientation_updated', 'orientation_request', ?, ?)",
    )
    .bind(
      profile.email,
      id,
      JSON.stringify({
        from: current.status,
        to: status,
        assignedCenterId,
        notesChanged: adminNotes !== String(current.admin_notes ?? ""),
      }),
    )
    .run();
  return { ok: true, id, status };
}
