import "server-only";

import testimonyCatalog from "../testimonios-data.json";
import { PortalError, type PortalProfile } from "./directory-store";
import { getRuntimeEnv, type D1StatementLike } from "./runtime-env";
import { activePortalRecipients, announcementHtml, notifyRecipients } from "./notification-store";

type UploadKind = "testimony" | "material";

type ContentInput = Record<string, string>;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const TESTIMONY_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "md", "rtf", "json"]);
const MATERIAL_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "rtf", "jpg", "jpeg", "png"]);
const MATERIAL_CATEGORIES = new Set(["protocolos", "responsivas", "reglamentos", "formatos", "experiencias", "otros"]);
const ANNOUNCEMENT_PRIORITIES = new Set(["info", "important", "urgent"]);
const ANNOUNCEMENT_AUDIENCES = new Set(["all", "member", "leader", "osg", "delegate", "council"]);
const CONTENT_STATUSES = new Set(["draft", "published", "archived"]);

const initialMaterials = [
  {
    id: "MAT-PROTOCOLO-SESION-DIARIA",
    title: "Protocolo de Sesión Diaria",
    category: "protocolos",
    description: "Guía para abrir, conducir y cerrar la sesión. Incluye bienvenida, enunciado, tribuna, séptima tradición, despedida y anexos de apoyo.",
    versionLabel: "PDF · 3 páginas · A4",
    staticUrl: "/api/private-materials?id=protocolo-sesion-diaria",
    previewUrl: "/api/private-materials?id=protocolo-sesion-diaria-preview",
    fileName: "protocolo-sesion-diaria.pdf",
    fileType: "application/pdf",
    sortOrder: 10,
  },
  {
    id: "MAT-PROTOCOLO-ANIVERSARIOS",
    title: "Protocolo de Aniversarios",
    category: "protocolos",
    description: "Orden operativo para sesiones de aniversario: duración, participantes, tiempos de tribuna, séptima tradición, reconocimientos y cierre.",
    versionLabel: "PDF · 3 páginas · A4",
    staticUrl: "/api/private-materials?id=protocolo-aniversarios",
    previewUrl: "/api/private-materials?id=protocolo-aniversarios-preview",
    fileName: "protocolo-aniversarios.pdf",
    fileType: "application/pdf",
    sortOrder: 20,
  },
  {
    id: "MAT-RESPONSIVA-COMPLETA-2026",
    title: "Hoja Responsiva FGDLL 2026",
    category: "responsivas",
    description: "Versión completa de consentimiento informado para la Experiencia de Hacienda. Incluye datos de salud, confidencialidad, derechos, riesgos y firmas.",
    versionLabel: "PDF · 2 páginas · Carta",
    staticUrl: "/api/private-materials?id=responsiva-completa-2026",
    previewUrl: "/api/private-materials?id=responsiva-completa-2026-preview",
    fileName: "hoja-responsiva-fgdll-2026-completa.pdf",
    fileType: "application/pdf",
    sortOrder: 30,
  },
  {
    id: "MAT-RESPONSIVA-COMPACTA-2026",
    title: "Hoja Responsiva FGDLL 2026 · Compacta",
    category: "responsivas",
    description: "Formato resumido para impresión rápida. Conserva las cláusulas esenciales, datos del participante, consentimiento y firmas.",
    versionLabel: "PDF · 2 páginas · Carta",
    staticUrl: "/api/private-materials?id=responsiva-compacta-2026",
    previewUrl: "/api/private-materials?id=responsiva-compacta-2026-preview",
    fileName: "hoja-responsiva-fgdll-2026-compacta.pdf",
    fileType: "application/pdf",
    sortOrder: 40,
  },
];

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos del portal no está disponible.", 503);
  return database;
}

function bucket() {
  const storage = getRuntimeEnv().BUCKET;
  if (!storage) throw new PortalError("El almacenamiento de archivos no está disponible.", 503);
  return storage;
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin") throw new PortalError("Solo administración puede gestionar este contenido.", 403);
}

function safeText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function lines(value: unknown) {
  return safeText(value, 5000).split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
}

function commaList(value: unknown) {
  return safeText(value, 2000).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30);
}

function parseJson(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function makeId(prefix: "TEMA" | "MAT" | "AVISO") {
  return `${prefix}-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function audit(actorEmail: string, action: string, targetType: string, targetId: string, details: unknown = {}) {
  await db().prepare(
    "INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?)"
  ).bind(actorEmail, action, targetType, targetId, JSON.stringify(details)).run();
}

async function runInChunks(statements: D1StatementLike[], size = 30) {
  for (let index = 0; index < statements.length; index += size) {
    await db().batch(statements.slice(index, index + size));
  }
}

export async function ensureContentSeeded() {
  const settings = await db().prepare(
    "SELECT key FROM content_settings WHERE key IN ('testimony_catalog_v1', 'leader_materials_v1', 'private_material_routes_v2')"
  ).all<{ key: string }>();
  const keys = new Set((settings.results ?? []).map((row) => row.key));

  if (!keys.has("testimony_catalog_v1")) {
    const statements = (testimonyCatalog as Record<string, unknown>[]).map((topic, index) => {
      const id = safeText(topic.id, 120) || `TEMA-CATALOGO-${String(index + 1).padStart(3, "0")}`;
      return db().prepare(
        `INSERT OR IGNORE INTO testimony_topics
          (id, title, category, intensity, moment, objective, anchor, payload_json, status, origin, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 'catalog', 'system')`
      ).bind(
        id,
        safeText(topic.titulo, 200) || `Tema ${index + 1}`,
        safeText(topic.categoria, 100) || "General",
        safeText(topic.intensidad, 40) || "Media",
        safeText(topic.momento, 40) || "Mitad",
        safeText(topic.objetivo, 1600),
        safeText(topic.fraseAncla, 500),
        JSON.stringify(topic),
      );
    });
    await runInChunks(statements);
    await db().prepare(
      "INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('testimony_catalog_v1', 'seeded', CURRENT_TIMESTAMP)"
    ).run();
  }

  if (!keys.has("leader_materials_v1")) {
    const statements = initialMaterials.map((material) => db().prepare(
      `INSERT OR IGNORE INTO leader_materials
        (id, title, category, description, version_label, static_url, preview_url, file_name, file_type, status, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, 'system')`
    ).bind(
      material.id, material.title, material.category, material.description, material.versionLabel,
      material.staticUrl, material.previewUrl, material.fileName, material.fileType, material.sortOrder,
    ));
    await runInChunks(statements);
    await db().prepare(
      "INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('leader_materials_v1', 'seeded', CURRENT_TIMESTAMP)"
    ).run();
  }

  if (!keys.has("private_material_routes_v2")) {
    const protectedRoutes = new Map(initialMaterials.map((material) => [material.id, material]));
    const statements = Array.from(protectedRoutes.entries()).map(([id, material]) => db().prepare(
      "UPDATE leader_materials SET static_url = ?, preview_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(material.staticUrl, material.previewUrl, id));
    await runInChunks(statements);
    await db().prepare(
      "INSERT OR REPLACE INTO content_settings (key, value, updated_at) VALUES ('private_material_routes_v2', 'seeded', CURRENT_TIMESTAMP)"
    ).run();
  }
}

function extension(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

function cleanFilename(filename: string) {
  const cleaned = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
  return cleaned || "archivo";
}

async function storeFile(kind: UploadKind, id: string, file: File) {
  if (!file.size) throw new PortalError("Selecciona un archivo con contenido.");
  if (file.size > MAX_FILE_SIZE) throw new PortalError("El archivo no puede pesar más de 25 MB.");
  const allowed = kind === "testimony" ? TESTIMONY_EXTENSIONS : MATERIAL_EXTENSIONS;
  if (!allowed.has(extension(file.name))) {
    throw new PortalError(kind === "testimony"
      ? "Usa un archivo PDF, Word, texto, Markdown, RTF o JSON."
      : "Usa un archivo PDF, Word, Excel, PowerPoint, texto o imagen.");
  }
  const filename = cleanFilename(file.name);
  const key = `${kind === "testimony" ? "testimonios" : "materiales"}/${id}/${crypto.randomUUID()}-${filename}`;
  const contentType = safeText(file.type, 120) || "application/octet-stream";
  await bucket().put(key, file.stream(), {
    httpMetadata: { contentType, contentDisposition: `inline; filename="${filename}"` },
  });
  return { key, filename, contentType, size: file.size };
}

export async function listTestimonyTopics(profile?: PortalProfile, adminView = false) {
  await ensureContentSeeded();
  if (adminView) {
    if (!profile) throw new PortalError("No tienes permiso para consultar esta vista.", 403);
    requireAdmin(profile);
  }
  const result = await db().prepare(
    `SELECT * FROM testimony_topics ${adminView ? "" : "WHERE status = 'published'"}
     ORDER BY category COLLATE NOCASE, title COLLATE NOCASE`
  ).all<Record<string, unknown>>();
  return result.results ?? [];
}

function testimonyPayload(input: ContentInput, current: Record<string, unknown> = {}) {
  return {
    ...current,
    titulo: safeText(input.title, 200),
    tituloCorto: safeText(input.shortTitle, 200),
    categoria: safeText(input.category, 100) || "General",
    intensidad: safeText(input.intensity, 40) || "Media",
    momento: safeText(input.moment, 40) || "Mitad",
    objetivo: safeText(input.objective, 1600),
    fraseAncla: safeText(input.anchor, 500),
    desarrollo: safeText(input.development, 5000),
    etiquetas: commaList(input.tags),
    palabrasClave: commaList(input.keywords),
    pasos: commaList(input.steps),
    guiaTestimonio: {
      detectar: lines(input.detect),
      admitir: lines(input.admit),
      corregir: lines(input.correct),
    },
    advertenciaEtica: safeText(input.ethicsNote, 2000),
    advertenciaLider: safeText(input.leaderNote, 2000),
    noUsarPara: lines(input.notFor),
    estado: input.status === "published" ? "Vigente" : input.status === "archived" ? "Archivado" : "Borrador",
  };
}

export async function saveTestimonyTopic(profile: PortalProfile, input: ContentInput, file?: File | null) {
  requireAdmin(profile);
  await ensureContentSeeded();
  const title = safeText(input.title, 200);
  if (!title) throw new PortalError("Escribe el título del tema.");
  const status = CONTENT_STATUSES.has(input.status) ? input.status : "published";
  const id = safeText(input.id, 120) || makeId("TEMA");
  const existing = await db().prepare("SELECT * FROM testimony_topics WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (input.id && !existing) throw new PortalError("El tema ya no existe.", 404);
  if (!existing && !file) throw new PortalError("Selecciona el archivo que contiene el nuevo tema.");

  const stored = file ? await storeFile("testimony", id, file) : null;
  const payload = testimonyPayload(input, parseJson(existing?.payload_json));
  try {
    await db().prepare(
      `INSERT INTO testimony_topics
        (id, title, category, intensity, moment, objective, anchor, payload_json, file_key, file_name,
         file_type, file_size, status, origin, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upload', ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category,
       intensity = excluded.intensity, moment = excluded.moment, objective = excluded.objective,
       anchor = excluded.anchor, payload_json = excluded.payload_json,
       file_key = excluded.file_key, file_name = excluded.file_name, file_type = excluded.file_type,
       file_size = excluded.file_size, status = excluded.status, updated_at = CURRENT_TIMESTAMP`
    ).bind(
      id, title, String(payload.categoria), String(payload.intensidad), String(payload.momento),
      String(payload.objetivo), String(payload.fraseAncla), JSON.stringify(payload),
      stored?.key ?? existing?.file_key ?? null,
      stored?.filename ?? existing?.file_name ?? "",
      stored?.contentType ?? existing?.file_type ?? "",
      stored?.size ?? existing?.file_size ?? 0,
      status, profile.email,
    ).run();
  } catch (error) {
    if (stored) await bucket().delete(stored.key);
    throw error;
  }
  if (stored && existing?.file_key && String(existing.file_key) !== stored.key) {
    await bucket().delete(String(existing.file_key));
  }
  await audit(profile.email, existing ? "testimony_updated" : "testimony_created", "testimony_topic", id, { title, status, fileName: stored?.filename });
  return { id, status };
}

export async function deleteTestimonyTopic(profile: PortalProfile, id: string, confirmation: string) {
  requireAdmin(profile);
  const row = await db().prepare("SELECT * FROM testimony_topics WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("El tema ya no existe.", 404);
  if (safeText(confirmation, 200) !== String(row.title)) throw new PortalError("Escribe el título exacto para confirmar el borrado.");
  await db().prepare("DELETE FROM testimony_topics WHERE id = ?").bind(id).run();
  if (row.file_key) await bucket().delete(String(row.file_key));
  await audit(profile.email, "testimony_deleted", "testimony_topic", id, { title: row.title, payload: parseJson(row.payload_json) });
  return { id, deleted: true };
}

export async function listLeaderMaterials(profile?: PortalProfile, adminView = false) {
  await ensureContentSeeded();
  if (adminView) {
    if (!profile) throw new PortalError("No tienes permiso para consultar esta vista.", 403);
    requireAdmin(profile);
  }
  const result = await db().prepare(
    `SELECT * FROM leader_materials ${adminView ? "" : "WHERE status = 'published'"}
     ORDER BY sort_order, title COLLATE NOCASE`
  ).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function saveLeaderMaterial(profile: PortalProfile, input: ContentInput, file?: File | null) {
  requireAdmin(profile);
  await ensureContentSeeded();
  const title = safeText(input.title, 200);
  if (!title) throw new PortalError("Escribe el nombre del material.");
  const category = MATERIAL_CATEGORIES.has(input.category) ? input.category : "otros";
  const status = CONTENT_STATUSES.has(input.status) ? input.status : "published";
  const id = safeText(input.id, 120) || makeId("MAT");
  const existing = await db().prepare("SELECT * FROM leader_materials WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (input.id && !existing) throw new PortalError("El material ya no existe.", 404);
  if (!existing && !file) throw new PortalError("Selecciona el archivo del nuevo material.");
  const stored = file ? await storeFile("material", id, file) : null;
  const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Math.max(0, Math.min(9999, Number(input.sortOrder))) : Number(existing?.sort_order ?? 100);
  try {
    await db().prepare(
      `INSERT INTO leader_materials
        (id, title, category, description, version_label, file_key, static_url, preview_url,
         file_name, file_type, file_size, status, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category,
       description = excluded.description, version_label = excluded.version_label,
       file_key = excluded.file_key, static_url = excluded.static_url, preview_url = excluded.preview_url,
       file_name = excluded.file_name, file_type = excluded.file_type, file_size = excluded.file_size,
       status = excluded.status, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`
    ).bind(
      id, title, category, safeText(input.description, 2400), safeText(input.versionLabel, 160),
      stored?.key ?? existing?.file_key ?? null,
      stored ? null : existing?.static_url ?? null,
      stored ? null : existing?.preview_url ?? null,
      stored?.filename ?? existing?.file_name ?? "",
      stored?.contentType ?? existing?.file_type ?? "",
      stored?.size ?? existing?.file_size ?? 0,
      status, sortOrder, profile.email,
    ).run();
  } catch (error) {
    if (stored) await bucket().delete(stored.key);
    throw error;
  }
  if (stored && existing?.file_key && String(existing.file_key) !== stored.key) {
    await bucket().delete(String(existing.file_key));
  }
  await audit(profile.email, existing ? "leader_material_updated" : "leader_material_created", "leader_material", id, { title, category, status, fileName: stored?.filename });
  return { id, status };
}

export async function deleteLeaderMaterial(profile: PortalProfile, id: string, confirmation: string) {
  requireAdmin(profile);
  const row = await db().prepare("SELECT * FROM leader_materials WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("El material ya no existe.", 404);
  if (safeText(confirmation, 200) !== String(row.title)) throw new PortalError("Escribe el nombre exacto para confirmar el borrado.");
  await db().prepare("DELETE FROM leader_materials WHERE id = ?").bind(id).run();
  if (row.file_key) await bucket().delete(String(row.file_key));
  await audit(profile.email, "leader_material_deleted", "leader_material", id, { title: row.title, fileName: row.file_name });
  return { id, deleted: true };
}

export async function getContentFile(profile: PortalProfile, kind: UploadKind, id: string) {
  const table = kind === "testimony" ? "testimony_topics" : "leader_materials";
  const row = await db().prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("El archivo ya no está disponible.", 404);
  if (String(row.status) !== "published" && profile.role !== "admin") throw new PortalError("Este archivo no está publicado.", 403);
  if (kind === "material" && row.static_url) return { staticUrl: String(row.static_url) };
  if (!row.file_key) throw new PortalError("Este registro no tiene un archivo adjunto.", 404);
  const object = await bucket().get(String(row.file_key));
  if (!object) throw new PortalError("No se encontró el archivo almacenado.", 404);
  return {
    body: object.body,
    size: object.size,
    contentType: String(row.file_type || "application/octet-stream"),
    filename: cleanFilename(String(row.file_name || "archivo")),
    etag: object.httpEtag,
  };
}

export async function listAnnouncements(profile: PortalProfile, adminView = false) {
  if (adminView) {
    requireAdmin(profile);
    const result = await db().prepare("SELECT *, 0 AS read_revision FROM announcements ORDER BY created_at DESC").all<Record<string, unknown>>();
    return result.results ?? [];
  }
  const result = await db().prepare(
    `SELECT a.*, COALESCE(ar.revision, 0) AS read_revision
	     FROM announcements a
	     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_email = ?
	     WHERE a.status = 'published' AND (a.audience = 'all' OR a.audience = ?) AND ar.archived_at IS NULL
     ORDER BY CASE a.priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
       a.published_at DESC, a.created_at DESC`
  ).bind(profile.email, profile.role).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function saveAnnouncement(profile: PortalProfile, input: ContentInput) {
  requireAdmin(profile);
  const title = safeText(input.title, 200);
  const body = safeText(input.body, 8000);
  if (!title || !body) throw new PortalError("El aviso necesita título y contenido.");
  const priority = ANNOUNCEMENT_PRIORITIES.has(input.priority) ? input.priority : "info";
  const audience = ANNOUNCEMENT_AUDIENCES.has(input.audience) ? input.audience : "all";
  const status = input.status === "published" ? "published" : "draft";
  const id = safeText(input.id, 120) || makeId("AVISO");
  const existing = await db().prepare("SELECT * FROM announcements WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (input.id && !existing) throw new PortalError("El aviso ya no existe.", 404);
  await db().prepare(
    `INSERT INTO announcements
      (id, title, summary, body, priority, audience, status, revision, created_by, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary,
     body = excluded.body, priority = excluded.priority, audience = excluded.audience,
     status = excluded.status, revision = announcements.revision + 1,
     published_at = CASE
       WHEN excluded.status = 'published' AND announcements.status != 'published' THEN CURRENT_TIMESTAMP
       WHEN excluded.status = 'published' THEN announcements.published_at
       ELSE NULL END,
     updated_at = CURRENT_TIMESTAMP`
  ).bind(
    id, title, safeText(input.summary, 600), body, priority, audience, status,
    profile.email, status,
  ).run();
  await audit(profile.email, existing ? "announcement_updated" : "announcement_created", "announcement", id, { title, priority, audience, status });
  if (status === "published") {
    const recipients = await activePortalRecipients(db(), audience);
    const delivery = await notifyRecipients(
      recipients,
      title,
      announcementHtml(title, safeText(input.summary, 600), body),
      `FGDLL: ${title}. ${safeText(input.summary, 240) || "Tienes un nuevo aviso en el portal."} https://fgdll.org/lider#avisos`,
    );
    await audit(profile.email, "announcement_notifications_queued", "announcement", id, delivery);
  }
  return { id, status };
}

export async function markAnnouncementRead(profile: PortalProfile, id: string) {
  const announcement = await db().prepare(
    "SELECT id, revision FROM announcements WHERE id = ? AND status = 'published' AND (audience = 'all' OR audience = ?)"
  ).bind(id, profile.role).first<{ id: string; revision: number }>();
  if (!announcement) throw new PortalError("El aviso ya no está disponible.", 404);
  await db().prepare(
    `INSERT INTO announcement_reads (announcement_id, user_email, revision)
     VALUES (?, ?, ?)
     ON CONFLICT(announcement_id, user_email) DO UPDATE SET revision = excluded.revision, read_at = CURRENT_TIMESTAMP`
  ).bind(id, profile.email, announcement.revision).run();
  return { id, read: true };
}

export async function archiveAnnouncementRead(profile: PortalProfile, id: string) {
  const announcement = await db().prepare(
    "SELECT id, revision FROM announcements WHERE id = ? AND status = 'published' AND (audience = 'all' OR audience = ?)"
  ).bind(id, profile.role).first<{ id: string; revision: number }>();
  if (!announcement) throw new PortalError("El aviso ya no está disponible.", 404);
  await db().prepare(
    `INSERT INTO announcement_reads (announcement_id, user_email, revision, archived_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(announcement_id, user_email) DO UPDATE SET revision = excluded.revision,
       archived_at = CURRENT_TIMESTAMP, read_at = CURRENT_TIMESTAMP`
  ).bind(id, profile.email, announcement.revision).run();
  return { id, archived: true };
}

export async function deleteAnnouncement(profile: PortalProfile, id: string, confirmation: string) {
  requireAdmin(profile);
  const row = await db().prepare("SELECT * FROM announcements WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) throw new PortalError("El aviso ya no existe.", 404);
  if (safeText(confirmation, 200) !== String(row.title)) throw new PortalError("Escribe el título exacto para confirmar el borrado.");
  await db().batch([
    db().prepare("DELETE FROM announcement_reads WHERE announcement_id = ?").bind(id),
    db().prepare("DELETE FROM announcements WHERE id = ?").bind(id),
  ]);
  await audit(profile.email, "announcement_deleted", "announcement", id, { title: row.title, body: row.body });
  return { id, deleted: true };
}
