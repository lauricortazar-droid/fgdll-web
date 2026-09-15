import "server-only";

import { PortalError } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";

export type DistributionWorkspaceRecord = {
  state: Record<string, unknown> | null;
  revision: number;
  updatedAt: string | null;
};

const MAX_PAYLOAD_BYTES = 1_000_000;
const LIMITS = {
  contacts: 5_000,
  lists: 1_500,
  templates: 1_500,
  campaigns: 1_500,
  recipientsPerCampaign: 10_000,
};
const EMPTY_STATE = {
  contacts: [],
  lists: [],
  templates: [
    {
      id: "tpl-bienvenida",
      title: "Bienvenida al portal",
      body: "Hola {nombre}, tu acceso al Portal FGDLL ya fue activado. Bienvenido.",
      category: "Accesos",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ],
  campaigns: [],
  settings: { defaultCountryCode: "52" },
};

function d1() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos del portal no está disponible.", 503);
  return database;
}

function owner(email: string) {
  return email.trim().toLowerCase();
}

function changedRows(result: unknown) {
  if (!result || typeof result !== "object") return 0;
  const meta = (result as { meta?: { changes?: number } }).meta;
  return Number(meta?.changes ?? 0);
}

function asArray(value: unknown, name: keyof typeof LIMITS) {
  if (!Array.isArray(value)) throw new PortalError(`El bloque ${name} no tiene un formato válido.`);
  if (value.length > LIMITS[name]) throw new PortalError(`El bloque ${name} excede el límite permitido.`);
  return value;
}

function sanitizeWorkspaceState(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PortalError("El estado de mensajería no tiene un formato válido.");
  }

  const state = input as Record<string, unknown>;
  const contacts = asArray(state.contacts, "contacts");
  const lists = asArray(state.lists, "lists");
  const templates = asArray(state.templates, "templates");
  const campaigns = asArray(state.campaigns, "campaigns");

  for (const campaign of campaigns) {
    if (!campaign || typeof campaign !== "object" || Array.isArray(campaign)) {
      throw new PortalError("Hay una campaña con formato inválido.");
    }
    const recipients = (campaign as Record<string, unknown>).recipients;
    if (!Array.isArray(recipients)) throw new PortalError("Hay una campaña sin destinatarios válidos.");
    if (recipients.length > LIMITS.recipientsPerCampaign) {
      throw new PortalError("Una campaña excede el límite de destinatarios permitido.");
    }
  }

  if (!state.settings || typeof state.settings !== "object" || Array.isArray(state.settings)) {
    throw new PortalError("La configuración de mensajería no tiene un formato válido.");
  }

  const normalized = {
    contacts,
    lists,
    templates,
    campaigns,
    settings: state.settings,
  };
  const serialized = JSON.stringify(normalized);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) {
    throw new PortalError("El respaldo de mensajería es demasiado grande para sincronizarse.");
  }
  return { normalized, serialized };
}

export async function getDistributionWorkspace(email: string): Promise<DistributionWorkspaceRecord> {
  const row = await d1().prepare(
    "SELECT payload_json, revision, updated_at FROM distribution_workspaces WHERE owner_email = ?"
  ).bind(owner(email)).first<Record<string, unknown>>();

  if (!row) return { state: null, revision: 0, updatedAt: null };

  try {
    const parsed = JSON.parse(String(row.payload_json ?? "{}"));
    return {
      state: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null,
      revision: Number(row.revision ?? 0),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  } catch {
    throw new PortalError("El respaldo sincronizado no pudo leerse. Contacta a administración.", 500);
  }
}

export async function saveDistributionWorkspace(email: string, input: unknown, expectedRevision?: number) {
  const { normalized, serialized } = sanitizeWorkspaceState(input);
  const normalizedOwner = owner(email);
  const current = await d1().prepare(
    "SELECT revision FROM distribution_workspaces WHERE owner_email = ?"
  ).bind(normalizedOwner).first<Record<string, unknown>>();
  const currentRevision = current ? Number(current.revision ?? 0) : 0;

  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0) {
    throw new PortalError("La revisión de sincronización no es válida.");
  }
  if (expectedRevision !== currentRevision) {
    throw new PortalError("Hay cambios más recientes en otro dispositivo. Elige cuál versión conservar.", 409);
  }

  if (!current) {
    const result = await d1().prepare(
      `INSERT OR IGNORE INTO distribution_workspaces (owner_email, payload_json, revision, updated_at)
       VALUES (?, ?, 1, CURRENT_TIMESTAMP)`
    ).bind(normalizedOwner, serialized).run();
    if (changedRows(result) === 0) {
      throw new PortalError("Hay cambios más recientes en otro dispositivo. Elige cuál versión conservar.", 409);
    }
  } else {
    const result = await d1().prepare(
      `UPDATE distribution_workspaces
       SET payload_json = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
       WHERE owner_email = ? AND revision = ?`
    ).bind(serialized, normalizedOwner, currentRevision).run();
    if (changedRows(result) === 0) {
      throw new PortalError("Hay cambios más recientes en otro dispositivo. Elige cuál versión conservar.", 409);
    }
  }

  const row = await d1().prepare(
    "SELECT revision, updated_at FROM distribution_workspaces WHERE owner_email = ?"
  ).bind(normalizedOwner).first<Record<string, unknown>>();

  return {
    state: normalized,
    revision: currentRevision + 1,
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  };
}

export async function deleteDistributionWorkspace(email: string) {
  await d1().prepare("DELETE FROM distribution_workspaces WHERE owner_email = ?").bind(owner(email)).run();
}

export async function addPendingDistributionContact(ownerEmail: string, input: {
  email: string;
  name: string;
  phone?: string;
  group?: string;
  zone?: string;
  notes?: string;
}) {
  const normalizedOwner = owner(ownerEmail);
  const row = await d1().prepare(
    "SELECT payload_json, revision FROM distribution_workspaces WHERE owner_email = ?"
  ).bind(normalizedOwner).first<Record<string, unknown>>();
  const state = row?.payload_json
    ? JSON.parse(String(row.payload_json)) as Record<string, unknown>
    : structuredClone(EMPTY_STATE) as Record<string, unknown>;
  const current = sanitizeWorkspaceState(state).normalized;
  const now = new Date().toISOString();
  const email = input.email.trim().toLowerCase();
  const phone = String(input.phone ?? "").replace(/[^\d+]/g, "").slice(0, 18);
  const [firstName, ...lastParts] = (input.name.trim() || email).split(/\s+/);
  const contactId = `portal-${email.replace(/[^a-z0-9]/g, "-") || crypto.randomUUID()}`;
  const contacts = current.contacts as Record<string, unknown>[];
  const existing = contacts.find((contact) =>
    String(contact.id) === contactId ||
    (email && String(contact.notes ?? "").toLowerCase().includes(email)) ||
    (phone && String(contact.phone ?? "").replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-10)))
  );
  const contact = {
    id: existing?.id ?? contactId,
    firstName,
    lastName: lastParts.join(" "),
    phone,
    countryCode: "52",
    organization: "Portal FGDLL",
    group: input.group ?? "",
    zone: input.zone ?? "",
    tags: ["pendiente", "registro-aprobado"],
    notes: [input.notes || "Acceso aprobado en Portal FGDLL", email ? `Correo: ${email}` : ""].filter(Boolean).join("\n"),
    status: "active",
    archived: false,
    createdAt: String(existing?.createdAt ?? now),
    updatedAt: now,
    lastMessageAt: null,
  };
  if (existing) Object.assign(existing, contact);
  else contacts.unshift(contact);

  const lists = current.lists as Record<string, unknown>[];
  let pendingList = lists.find((list) => String(list.id) === "lista-registros-pendientes");
  if (!pendingList) {
    pendingList = { id: "lista-registros-pendientes", name: "Pendientes de registro", contactIds: [], createdAt: now, updatedAt: now };
    lists.unshift(pendingList);
  }
  const contactIds = Array.isArray(pendingList.contactIds) ? pendingList.contactIds as string[] : [];
  if (!contactIds.includes(String(contact.id))) contactIds.unshift(String(contact.id));
  pendingList.contactIds = contactIds;
  pendingList.updatedAt = now;

  const serialized = JSON.stringify(current);
  if (row) {
    await d1().prepare(
      `UPDATE distribution_workspaces SET payload_json = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE owner_email = ?`
    ).bind(serialized, normalizedOwner).run();
  } else {
    await d1().prepare(
      `INSERT INTO distribution_workspaces (owner_email, payload_json, revision, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)`
    ).bind(normalizedOwner, serialized).run();
  }
  return { ok: true, ownerEmail: normalizedOwner, contactId: String(contact.id) };
}
