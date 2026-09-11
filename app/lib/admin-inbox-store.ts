import "server-only";

import { isAdminEmail, PortalError, type PortalProfile } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";

export type AdminInboxItem = {
  id: string; kind: string; area: string; title: string; contactName: string;
  email: string; phone: string; status: string; createdAt: string; updatedAt: string;
  href: string; priority: string; itemKey: string; unread: boolean;
};

const inboxQueries = [
  `SELECT id, 'orientation' AS kind, 'Orientación' AS area,
    'Solicitud de orientación' AS title, requester_name AS contact_name, '' AS email, whatsapp AS phone,
    status, created_at, updated_at, '/administracion/orientacion' AS href,
    CASE WHEN danger = 'yes' THEN 'urgent' ELSE 'normal' END AS priority
  FROM orientation_requests WHERE status != 'closed'`,
  `SELECT CAST(id AS TEXT) AS id, 'ethics' AS kind, 'Ética' AS area, 'Reporte confidencial ' || public_folio AS title,
    'Contacto protegido' AS contact_name, '' AS email, CASE WHEN contact_method = 'none' THEN '' ELSE safe_contact END AS phone,
    status, created_at, updated_at, '/administracion/etica' AS href,
    CASE WHEN severity IN ('critical', 'high') THEN 'urgent' ELSE 'normal' END AS priority
  FROM ethics_reports WHERE status != 'closed'`,
  `SELECT id, 'access' AS kind, 'Accesos' AS area, 'Solicitud de acceso al portal' AS title,
    requester_name AS contact_name, requester_email AS email, phone,
    status, created_at, updated_at, '/directorio/gestion' AS href, 'normal' AS priority
  FROM access_requests WHERE status IN ('pending', 'in_review', 'changes_requested')`,
  `SELECT id, 'directory' AS kind, 'Directorio' AS area, 'Solicitud de cambio en directorio' AS title,
    requester_name AS contact_name, requester_email AS email, '' AS phone,
    status, created_at, updated_at, '/directorio/gestion' AS href, 'normal' AS priority
  FROM directory_change_requests WHERE status IN ('pending', 'in_review', 'changes_requested')`,
  `SELECT id, 'group' AS kind, 'Grupos' AS area, 'Registro de nuevo grupo · Zona ' || zone AS title,
    requester_name AS contact_name, requester_email AS email, '' AS phone,
    status, created_at, updated_at, '/administracion/registrar-grupo#revision' AS href, 'normal' AS priority
  FROM group_registration_requests WHERE status IN ('pending', 'in_review', 'changes_requested')`,
  `SELECT id, 'center' AS kind, 'Centros' AS area,
    CASE WHEN request_type = 'registration' THEN 'Registro de nuevo centro' ELSE 'Cambio de información de centro' END AS title,
    requester_name AS contact_name, requester_email AS email, requester_phone AS phone,
    status, created_at, updated_at, '/administracion/centros' AS href, 'normal' AS priority
  FROM center_requests WHERE status IN ('pending', 'changes_requested')`,
  `SELECT CAST(id AS TEXT) AS id, 'university_user' AS kind, 'Universidad' AS area, 'Registro de participante' AS title,
    full_name AS contact_name, email, mobile_phone AS phone,
    status, created_at, updated_at, '/administracion/universidad' AS href, 'normal' AS priority
  FROM university_users WHERE status IN ('pending', 'active')`,
  `SELECT id, 'university_center' AS kind, 'Universidad' AS area, 'Registro colectivo · ' || center_name AS title,
    center_name AS contact_name, director_email AS email, mobile_phone AS phone,
    status, created_at, updated_at, '/administracion/universidad' AS href, 'normal' AS priority
  FROM university_center_batches WHERE status IN ('received', 'in_review', 'changes_requested')`,
  `SELECT id, 'certificate' AS kind, 'Universidad' AS area, 'Solicitud de reconocimiento' AS title,
    full_name AS contact_name, email, mobile_phone AS phone,
    status, created_at, updated_at, '/administracion/universidad' AS href, 'normal' AS priority
  FROM university_certificate_requests WHERE status IN ('pending_validation', 'in_review', 'approved', 'ready')`,
  `SELECT CAST(id AS TEXT) AS id, 'issued_recognition' AS kind, 'Universidad' AS area,
    'Reconocimiento por concluir · ' || full_name AS title, full_name AS contact_name, '' AS email, '' AS phone,
    CASE WHEN printed_at IS NULL THEN 'pending_print' WHEN sent_at IS NULL THEN 'pending_send' ELSE 'ready_delivery' END AS status,
    created_at, updated_at, '/administracion/universidad/reconocimientos' AS href, 'normal' AS priority
  FROM university_recognitions WHERE delivered_at IS NULL`,
];

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La bandeja administrativa no está disponible en este momento.", 503);
  return database;
}

export async function listAdminInbox(profile: PortalProfile) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email)) throw new PortalError("Solo administración puede consultar la bandeja general.", 403);
  const [categoryResults, readResult] = await Promise.all([
    Promise.allSettled(inboxQueries.map((query) => db().prepare(query).all<Record<string, unknown>>())),
    db().prepare("SELECT item_key, source_updated_at FROM admin_inbox_reads WHERE user_email = ?")
      .bind(profile.email.toLowerCase()).all<Record<string, unknown>>(),
  ]);
  const availableCategories = categoryResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!availableCategories.length && categoryResults.some((result) => result.status === "rejected")) {
    throw categoryResults.find((result) => result.status === "rejected")?.reason;
  }
  categoryResults.forEach((result, index) => {
    if (result.status === "rejected") console.error(`No fue posible cargar la categoría ${index + 1} de la bandeja administrativa.`, result.reason);
  });
  const readRevisions = new Map((readResult.results ?? []).map((row) => [String(row.item_key), String(row.source_updated_at)]));
  const rows = availableCategories.flatMap((result) => result.results ?? []);

  const items: AdminInboxItem[] = rows.map((row) => {
    const id = String(row.id);
    const kind = String(row.kind);
    const itemKey = `${kind}:${id}`;
    const updatedAt = String(row.updated_at);
    return {
      id, kind, itemKey, updatedAt,
      area: String(row.area), title: String(row.title),
      contactName: String(row.contact_name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""),
      status: String(row.status), createdAt: String(row.created_at),
      href: String(row.href), priority: String(row.priority ?? "normal"), unread: readRevisions.get(itemKey) !== updatedAt,
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 250);
  const byArea = items.reduce<Record<string, number>>((summary, item) => ({ ...summary, [item.area]: (summary[item.area] || 0) + 1 }), {});
  return { items, summary: { total: items.length, unread: items.filter((item) => item.unread).length, urgent: items.filter((item) => item.priority === "urgent").length, byArea } };
}

export async function markAdminInboxRead(profile: PortalProfile, itemKey: string, sourceUpdatedAt: string) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email)) throw new PortalError("Solo administración puede gestionar estos avisos.", 403);
  if (!/^[a-z_]+:.{1,80}$/.test(itemKey) || !sourceUpdatedAt.trim()) throw new PortalError("El aviso no es válido.");
  await db().prepare(`INSERT INTO admin_inbox_reads (item_key, user_email, source_updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(item_key, user_email) DO UPDATE SET source_updated_at = excluded.source_updated_at, read_at = CURRENT_TIMESTAMP`)
    .bind(itemKey, profile.email.toLowerCase(), sourceUpdatedAt.slice(0, 40)).run();
  return { itemKey, read: true };
}
