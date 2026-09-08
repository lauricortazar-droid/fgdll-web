import "server-only";

import { PortalError, type PortalProfile } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";

export type AdminInboxItem = {
  id: string; kind: string; area: string; title: string; contactName: string;
  email: string; phone: string; status: string; createdAt: string; href: string; priority: string;
};

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La bandeja administrativa no está disponible en este momento.", 503);
  return database;
}

export async function listAdminInbox(profile: PortalProfile) {
  if (profile.role !== "admin") throw new PortalError("Solo administración puede consultar la bandeja general.", 403);
  const result = await db().prepare(`
    SELECT id, 'orientation' AS kind, 'Orientación' AS area,
      'Solicitud de orientación' AS title, requester_name AS contact_name, '' AS email, whatsapp AS phone,
      status, created_at, '/administracion/orientacion' AS href,
      CASE WHEN danger = 'yes' THEN 'urgent' ELSE 'normal' END AS priority
    FROM orientation_requests WHERE status != 'closed'
    UNION ALL
    SELECT CAST(id AS TEXT), 'ethics', 'Ética', 'Reporte confidencial ' || public_folio,
      'Contacto protegido', '', CASE WHEN contact_method = 'none' THEN '' ELSE safe_contact END,
      status, created_at, '/administracion/etica',
      CASE WHEN severity IN ('critical', 'high') THEN 'urgent' ELSE 'normal' END
    FROM ethics_reports WHERE status != 'closed'
    UNION ALL
    SELECT id, 'access', 'Accesos', 'Solicitud de acceso al portal', requester_name, requester_email, phone,
      status, created_at, '/directorio/gestion', 'normal'
    FROM access_requests WHERE status IN ('pending', 'in_review', 'changes_requested')
    UNION ALL
    SELECT id, 'directory', 'Directorio', 'Solicitud de cambio en directorio', requester_name, requester_email, '',
      status, created_at, '/directorio/gestion', 'normal'
    FROM directory_change_requests WHERE status IN ('pending', 'in_review', 'changes_requested')
    UNION ALL
    SELECT id, 'group', 'Grupos', 'Registro de nuevo grupo · Zona ' || zone, requester_name, requester_email, '',
      status, created_at, '/administracion/registrar-grupo#revision', 'normal'
    FROM group_registration_requests WHERE status IN ('pending', 'in_review', 'changes_requested')
    UNION ALL
    SELECT id, 'center', 'Centros', CASE WHEN request_type = 'registration' THEN 'Registro de nuevo centro' ELSE 'Cambio de información de centro' END,
      requester_name, requester_email, requester_phone, status, created_at, '/administracion/centros', 'normal'
    FROM center_requests WHERE status IN ('pending', 'changes_requested')
    UNION ALL
    SELECT CAST(id AS TEXT), 'university_user', 'Universidad', 'Admisión de estudiante', full_name, email, mobile_phone,
      status, created_at, '/administracion/universidad', 'normal'
    FROM university_users WHERE status = 'pending'
    UNION ALL
    SELECT id, 'university_center', 'Universidad', 'Registro colectivo · ' || center_name, center_name, director_email, mobile_phone,
      status, created_at, '/administracion/universidad', 'normal'
    FROM university_center_batches WHERE status IN ('received', 'in_review', 'changes_requested')
    UNION ALL
    SELECT id, 'certificate', 'Universidad', 'Solicitud de reconocimiento', full_name, '', mobile_phone,
      status, created_at, '/administracion/universidad', 'normal'
    FROM university_certificate_requests WHERE status IN ('pending_validation', 'in_review', 'approved', 'ready')
    ORDER BY created_at DESC LIMIT 250
  `).all<Record<string, unknown>>();

  const items: AdminInboxItem[] = (result.results ?? []).map((row) => ({
    id: String(row.id), kind: String(row.kind), area: String(row.area), title: String(row.title),
    contactName: String(row.contact_name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""),
    status: String(row.status), createdAt: String(row.created_at), href: String(row.href), priority: String(row.priority ?? "normal"),
  }));
  const byArea = items.reduce<Record<string, number>>((summary, item) => ({ ...summary, [item.area]: (summary[item.area] || 0) + 1 }), {});
  return { items, summary: { total: items.length, urgent: items.filter((item) => item.priority === "urgent").length, byArea } };
}
