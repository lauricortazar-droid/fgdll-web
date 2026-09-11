import "server-only";

import { type PortalProfile, PortalError } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";

const PROGRAMS = new Set(["DPL1", "DPL2"]);
const YEARS = new Set([2022, 2025, 2026]);
const ACTION_COLUMNS = { sent: "sent_at", printed: "printed_at", delivered: "delivered_at" } as const;

function db() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("El módulo de reconocimientos no está disponible en este momento.", 503);
  return database;
}

function requireAdmin(profile: PortalProfile) {
  if (profile.role !== "admin") throw new PortalError("Solo Administración puede gestionar reconocimientos.", 403);
}

function clean(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function normalizeFolio(value: unknown) {
  const folio = clean(value, 80).toUpperCase();
  return /^[A-Z0-9-]{8,80}$/.test(folio) ? folio : "";
}

export async function listRecognitions(profile: PortalProfile) {
  requireAdmin(profile);
  const result = await db().prepare("SELECT * FROM university_recognitions ORDER BY archived_at IS NOT NULL, created_at DESC, id DESC LIMIT 1000")
    .all<Record<string, unknown>>();
  const items = result.results ?? [];
  const activeItems = items.filter((item) => !item.archived_at);
  return {
    items,
    summary: {
      total: items.length,
      pendingSend: activeItems.filter((item) => !item.sent_at).length,
      pendingPrint: activeItems.filter((item) => !item.printed_at).length,
      delivered: activeItems.filter((item) => Boolean(item.delivered_at)).length,
      archived: items.length - activeItems.length,
    },
  };
}

export async function createRecognition(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const program = clean(input.program, 10).toUpperCase();
  const year = Number(input.year);
  const fullName = clean(input.fullName, 180);
  const conocerFolio = clean(input.conocerFolio, 80).toUpperCase();
  if (!PROGRAMS.has(program)) throw new PortalError("Selecciona DPL1 o DPL2.");
  if (!YEARS.has(year)) throw new PortalError("Selecciona 2022, 2025 o 2026.");
  if (fullName.length < 4) throw new PortalError("Escribe el nombre completo del participante.");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await db().prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM university_recognitions WHERE year = ?")
      .bind(year).first<Record<string, unknown>>();
    const sequence = Number(row?.next_sequence || 1);
    const folio = `FGDLL-${year}-${String(sequence).padStart(4, "0")}`;
    try {
      const result = await db().prepare(`INSERT INTO university_recognitions
        (folio, sequence, program, year, full_name, conocer_folio, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`)
        .bind(folio, sequence, program, year, fullName, conocerFolio, profile.email)
        .first<Record<string, unknown>>();
      await db().prepare(`INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json)
        VALUES (?, 'university_recognition_created', 'university_recognition', ?, ?)`)
        .bind(profile.email, folio, JSON.stringify({ program, year, fullName })).run();
      return { recognition: result };
    } catch (error) {
      if (attempt === 3 || !String(error).toLowerCase().includes("unique")) throw error;
    }
  }
  throw new PortalError("No fue posible asignar el folio. Inténtalo de nuevo.");
}

export async function createRecognitionsBatch(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new PortalError("El archivo no contiene participantes válidos.");
  if (items.length > 200) throw new PortalError("Puedes importar hasta 200 participantes por archivo.");

  const created: Record<string, unknown>[] = [];
  const errors: { row: number; error: string }[] = [];
  for (const [index, value] of items.entries()) {
    const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const row = Number(item.row) || index + 2;
    try {
      const result = await createRecognition(profile, item);
      if (result.recognition) created.push(result.recognition);
    } catch (error) {
      errors.push({ row, error: error instanceof Error ? error.message : "No fue posible registrar esta fila." });
    }
  }
  return { created, errors };
}

export async function updateRecognition(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const id = Number(input.id);
  const action = clean(input.action, 20);
  if (!Number.isInteger(id) || id < 1) throw new PortalError("Selecciona un reconocimiento válido.");

  if (action === "archive" || action === "unarchive") {
    const archivedAt = action === "archive" ? "CURRENT_TIMESTAMP" : "NULL";
    const result = await db().prepare(`UPDATE university_recognitions
      SET archived_at = ${archivedAt}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? RETURNING *`).bind(id).first<Record<string, unknown>>();
    if (!result) throw new PortalError("El reconocimiento ya no existe.", 404);
    await db().prepare(`INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json)
      VALUES (?, ?, 'university_recognition', ?, '{}')`)
      .bind(profile.email, `university_recognition_${action}`, String(result.folio)).run();
    return { recognition: result };
  }

  const statusAction = action as keyof typeof ACTION_COLUMNS;
  const column = ACTION_COLUMNS[statusAction];
  if (!column) throw new PortalError("Selecciona una acción válida.");
  const result = await db().prepare(`UPDATE university_recognitions
    SET ${column} = COALESCE(${column}, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE id = ? RETURNING *`).bind(id).first<Record<string, unknown>>();
  if (!result) throw new PortalError("El reconocimiento ya no existe.", 404);
  await db().prepare(`INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json)
    VALUES (?, ?, 'university_recognition', ?, '{}')`)
    .bind(profile.email, `university_recognition_${statusAction}`, String(result.folio)).run();
  return { recognition: result };
}

export async function deleteRecognition(profile: PortalProfile, input: Record<string, unknown>) {
  requireAdmin(profile);
  const id = Number(input.id);
  if (!Number.isInteger(id) || id < 1) throw new PortalError("Selecciona un reconocimiento válido.");
  const result = await db().prepare("DELETE FROM university_recognitions WHERE id = ? RETURNING folio")
    .bind(id).first<Record<string, unknown>>();
  if (!result) throw new PortalError("El reconocimiento ya no existe.", 404);
  await db().prepare(`INSERT INTO audit_log (actor_email, action, target_type, target_id, details_json)
    VALUES (?, 'university_recognition_deleted', 'university_recognition', ?, '{}')`)
    .bind(profile.email, String(result.folio)).run();
  return { deleted: true, folio: result.folio };
}

export async function findPublicRecognition(folioValue: unknown) {
  const folio = normalizeFolio(folioValue);
  if (!folio) return null;
  return db().prepare(`SELECT folio, program, year, full_name, conocer_folio, created_at
    FROM university_recognitions WHERE folio = ?`).bind(folio).first<Record<string, unknown>>();
}
