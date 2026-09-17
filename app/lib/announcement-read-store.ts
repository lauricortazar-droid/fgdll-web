import "server-only";

import { getRuntimeEnv } from "./runtime-env";
import { isAdminEmail, PortalError, type PortalProfile } from "./directory-store";

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("Los avisos no están disponibles en este momento.", 503);
  return database;
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email)) {
    throw new PortalError("Solo Administración puede consultar todos los avisos.", 403);
  }
}

export async function listAnnouncementsWithRevision(profile: PortalProfile, adminView = false) {
  if (adminView) {
    requireAdmin(profile);
    const result = await db().prepare(
      "SELECT *, 0 AS read_revision FROM announcements ORDER BY created_at DESC",
    ).all<Record<string, unknown>>();
    return result.results ?? [];
  }

  const result = await db().prepare(
    `SELECT a.*, COALESCE(ar.revision, 0) AS read_revision
     FROM announcements a
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_email = ?
     WHERE a.status = 'published'
       AND (a.audience = 'all' OR a.audience = ?)
       AND (ar.archived_at IS NULL OR ar.revision < a.revision)
     ORDER BY CASE a.priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
       a.published_at DESC, a.created_at DESC`,
  ).bind(profile.email, profile.role).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function markAnnouncementReadCurrent(profile: PortalProfile, id: string) {
  const announcement = await db().prepare(
    "SELECT id, revision FROM announcements WHERE id = ? AND status = 'published' AND (audience = 'all' OR audience = ?)",
  ).bind(id, profile.role).first<{ id: string; revision: number }>();
  if (!announcement) throw new PortalError("El aviso ya no está disponible.", 404);

  await db().prepare(
    `INSERT INTO announcement_reads (announcement_id, user_email, revision, archived_at)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(announcement_id, user_email) DO UPDATE SET revision = excluded.revision,
       read_at = CURRENT_TIMESTAMP, archived_at = NULL`,
  ).bind(id, profile.email, announcement.revision).run();
  return { id, read: true };
}
