import "server-only";

import initialExperiences from "../monthly-experiences-data.json";
import { PortalError, type PortalProfile } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";

type ExperienceInput = Record<string, string>;

const ZONES = new Set(["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"]);
const STATUSES = new Set(["draft", "published", "archived"]);

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos del portal no está disponible.", 503);
  return database;
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin") throw new PortalError("Solo administración puede gestionar las experiencias.", 403);
}

function safeText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function writings(value: unknown) {
  const source = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  return Array.from(new Set(source.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))).slice(0, 12);
}

export async function ensureExperiencesSeeded() {
  const marker = await db().prepare("SELECT value FROM content_settings WHERE key = 'monthly_experiences_v3'").first<{ value: string }>();
  if (marker) return;
  const statements = initialExperiences.map((item) => db().prepare(
    `INSERT INTO monthly_experiences
      (id, month, zone, title, start_date, end_date, location, writings_json, notes, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system')
     ON CONFLICT(id) DO UPDATE SET month = excluded.month, zone = excluded.zone, title = excluded.title,
       start_date = excluded.start_date, end_date = excluded.end_date, location = excluded.location,
       writings_json = excluded.writings_json, notes = excluded.notes, status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(item.id, item.month, item.zone, item.title, item.startDate, item.endDate, item.location, JSON.stringify(item.writings), item.notes, item.status));
  await db().batch([
    db().prepare("DELETE FROM monthly_experiences WHERE id = 'EXP-2026-08-TIBURON' AND created_by = 'system'"),
    ...statements,
  ]);
  await db().prepare("INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('monthly_experiences_v3', 'seeded', CURRENT_TIMESTAMP)").run();
}

export async function listMonthlyExperiences(profile?: PortalProfile, adminView = false) {
  await ensureExperiencesSeeded();
  if (adminView) {
    if (!profile) throw new PortalError("No tienes permiso para consultar esta vista.", 403);
    requireAdmin(profile);
  }
  const result = await db().prepare(
    `SELECT * FROM monthly_experiences ${adminView ? "" : "WHERE status = 'published'"}
     ORDER BY month, start_date, zone COLLATE NOCASE`
  ).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function saveMonthlyExperience(profile: PortalProfile, input: ExperienceInput) {
  requireAdmin(profile);
  await ensureExperiencesSeeded();
  const zone = safeText(input.zone, 40);
  const title = safeText(input.title, 180);
  const startDate = safeText(input.startDate, 10);
  const endDate = safeText(input.endDate, 10);
  if (!ZONES.has(zone)) throw new PortalError("Selecciona una zona válida.");
  if (!title) throw new PortalError("Escribe el nombre de la experiencia.");
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) throw new PortalError("Revisa las fechas de la experiencia.");
  const status = STATUSES.has(input.status) ? input.status : "published";
  const id = safeText(input.id, 120) || `EXP-${startDate.slice(0, 4)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const list = writings(input.writings);
  await db().prepare(
    `INSERT INTO monthly_experiences
      (id, month, zone, title, start_date, end_date, location, writings_json, notes, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET month = excluded.month, zone = excluded.zone, title = excluded.title,
       start_date = excluded.start_date, end_date = excluded.end_date, location = excluded.location,
       writings_json = excluded.writings_json, notes = excluded.notes, status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(id, startDate.slice(0, 7), zone, title, startDate, endDate, safeText(input.location, 500), JSON.stringify(list), safeText(input.notes, 1200), status, profile.email).run();
  await db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, 'monthly_experience', ?, ?)")
    .bind(profile.email, input.id ? "experience_updated" : "experience_created", id, JSON.stringify({ zone, startDate, writings: list })).run();
  return { ok: true, id };
}

export async function deleteMonthlyExperience(profile: PortalProfile, id: string, confirmation: string) {
  requireAdmin(profile);
  const row = await db().prepare("SELECT title FROM monthly_experiences WHERE id = ?").bind(id).first<{ title: string }>();
  if (!row) throw new PortalError("La experiencia ya no existe.", 404);
  if (confirmation !== row.title) throw new PortalError("Escribe el título exacto para confirmar.");
  await db().batch([
    db().prepare("DELETE FROM monthly_experiences WHERE id = ?").bind(id),
    db().prepare("INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, 'experience_deleted', 'monthly_experience', ?, ?)")
      .bind(profile.email, id, JSON.stringify({ title: row.title })),
  ]);
  return { ok: true };
}
