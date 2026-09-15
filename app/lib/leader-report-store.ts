import "server-only";

import { getRuntimeEnv } from "./runtime-env";
import { PortalError, type PortalProfile } from "./directory-store";
import { notifyAdmins } from "./notification-store";

const CATEGORIES = new Set(["operacion", "integridad", "finanzas", "seguridad", "acompanamiento"]);
const SUPPORT = new Set(["Orientación", "Protección inmediata", "Revisión institucional", "Seguimiento operativo"]);

function database() {
  const value = getRuntimeEnv().DB;
  if (!value) throw new PortalError("Los reportes de liderazgo no están disponibles en este momento.", 503);
  return value;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function makeFolio() {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  return `LID-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function submitLeaderReport(profile: PortalProfile, input: Record<string, unknown>) {
  const category = clean(input.category, 30);
  const phone = clean(input.phone, 30);
  const groupZone = clean(input.groupZone, 180);
  const approximateDate = clean(input.approximateDate, 20);
  const narrative = clean(input.narrative, 10000);
  const peopleOrWitnesses = clean(input.peopleOrWitnesses, 3000);
  const supportNeeded = clean(input.supportNeeded, 80);

  if (!CATEGORIES.has(category)) throw new PortalError("Selecciona una categoría válida.");
  if (narrative.length < 30) throw new PortalError("Describe el reporte con al menos 30 caracteres.");
  if (!SUPPORT.has(supportNeeded)) throw new PortalError("Selecciona el seguimiento que necesitas.");

  const id = makeFolio();
  await database().batch([
    database().prepare(`INSERT INTO leader_reports
      (id, reporter_email, reporter_name, reporter_role, phone, category, group_zone, approximate_date,
       narrative, people_or_witnesses, support_needed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, profile.email, profile.name, profile.roleLabel || profile.role, phone, category, groupZone, approximateDate, narrative, peopleOrWitnesses, supportNeeded),
    database().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'leader_report_created', 'leader_report', ?, ?)")
      .bind(profile.email, id, JSON.stringify({ category, supportNeeded })),
  ]);
  await notifyAdmins(
    `Nuevo reporte de liderazgo ${id}`,
    `<h2>Nuevo reporte identificado de liderazgo</h2><p><strong>Folio:</strong> ${id}</p><p><strong>Reporta:</strong> ${clean(profile.name, 160)} (${profile.email})</p><p><strong>Categoría:</strong> ${category}</p><p><strong>Grupo/Zona:</strong> ${groupZone || "No indicado"}</p><p><strong>Seguimiento:</strong> ${supportNeeded}</p><p>Revísalo en <a href="https://fgdll.org/admin/contenidos?tab=announcements">fgdll.org/admin</a>.</p>`,
    `FGDLL: nuevo reporte de liderazgo ${id}`,
  );
  return { ok: true, id };
}
