"use client";

import { ChangeEvent, useRef, useState } from "react";

const STORAGE_KEY = "fgdll-whatsapp-distributor-v1";
const REPRINT_LIST_ID = "lista-reimpresion-reconocimientos-dpl";
const REPRINT_LIST_NAME = "Reimpresión reconocimientos DPL";

const cleanDigits = (value: string) => value.replace(/\D/g, "");
const normalizeHeader = (value: string) => value
  .replace(/^\uFEFF/, "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ");

function normalizePhone(phone: string, countryCode = "52") {
  let digits = cleanDigits(phone);
  const code = cleanDigits(countryCode);
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && code) return `${code}${digits}`;
  return digits;
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) count += 1;
  }
  return count;
}

function parseContacts(raw: string) {
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const candidates = ["|", "\t", ";", ","];
  const delimiter = candidates
    .map((candidate) => ({ candidate, count: countDelimiter(lines[0], candidate) }))
    .sort((a, b) => b.count - a.count)[0]?.candidate ?? ",";

  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);
  const find = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));

  const nameIndex = find(["nombre", "name", "nombre completo", "nombre del contacto"]);
  const lastNameIndex = find(["apellido", "apellidos", "lastname", "last name"]);
  const phoneIndex = find([
    "telefono", "phone", "celular", "whatsapp", "numero de whatsapp",
    "numero whatsapp", "numero de celular", "numero de celular con whatsapp",
    "telefono whatsapp", "celular whatsapp",
  ]);
  const zoneIndex = find(["zona", "zone", "zona de pertenencia"]);
  const groupIndex = find(["grupo", "group", "grupo centro", "grupo/centro", "agrupacion", "nombre del grupo"]);

  if (nameIndex < 0 || phoneIndex < 0) {
    throw new Error("El archivo debe contener columnas de Nombre y Teléfono/WhatsApp.");
  }

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    return {
      firstName: (cells[nameIndex] || "").trim(),
      lastName: lastNameIndex >= 0 ? (cells[lastNameIndex] || "").trim() : "",
      phone: (cells[phoneIndex] || "").trim(),
      zone: zoneIndex >= 0 ? (cells[zoneIndex] || "").trim() : "",
      group: groupIndex >= 0 ? (cells[groupIndex] || "").trim() : "",
    };
  }).filter((row) => row.firstName && row.phone);
}

type ImportResult = {
  added: number;
  updated: number;
  duplicates: number;
  invalid: number;
  total: number;
};

export function BulkContactImporter({ storageNamespace }: { storageNamespace: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const rows = parseContacts(await file.text());
      if (!rows.length) throw new Error("No encontré contactos válidos en el archivo.");

      const storageKey = `${STORAGE_KEY}:${storageNamespace}`;
      const raw = localStorage.getItem(storageKey);
      const fallback = {
        contacts: [],
        lists: [],
        templates: [],
        campaigns: [],
        settings: { defaultCountryCode: "52" },
      };
      const state = raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
      if (!Array.isArray(state.contacts)) state.contacts = [];
      if (!Array.isArray(state.lists)) state.lists = [];

      const defaultCode = String(state.settings?.defaultCountryCode || "52");
      const byPhone = new Map<string, any>();
      for (const contact of state.contacts) {
        const normalized = normalizePhone(String(contact.phone || ""), String(contact.countryCode || defaultCode));
        if (normalized) byPhone.set(normalized, contact);
      }

      const importedIds: string[] = [];
      let added = 0;
      let updated = 0;
      let duplicates = 0;
      let invalid = 0;
      const now = new Date().toISOString();

      for (const row of rows) {
        const normalized = normalizePhone(row.phone, defaultCode);
        if (normalized.length < 8 || normalized.length > 15) {
          invalid += 1;
          continue;
        }

        const existing = byPhone.get(normalized);
        if (existing) {
          duplicates += 1;
          const tags = Array.isArray(existing.tags) ? existing.tags.map(String) : [];
          if (!tags.includes("reimpresion-reconocimientos")) tags.push("reimpresion-reconocimientos");
          existing.tags = tags;
          if (!existing.zone && row.zone) existing.zone = row.zone;
          if (!existing.group && row.group) existing.group = row.group;
          existing.updatedAt = now;
          importedIds.push(String(existing.id));
          updated += 1;
          continue;
        }

        const id = `recon-${normalized}`;
        const contact = {
          id,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          countryCode: defaultCode,
          organization: "Universidad FGDLL",
          group: row.group,
          zone: row.zone,
          tags: ["reimpresion-reconocimientos"],
          notes: "Contacto importado para campaña de reimpresión de reconocimientos DPL.",
          status: "active",
          archived: false,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: null,
        };
        state.contacts.unshift(contact);
        byPhone.set(normalized, contact);
        importedIds.push(id);
        added += 1;
      }

      const uniqueIds = Array.from(new Set(importedIds));
      const existingList = state.lists.find((list: any) => String(list.id) === REPRINT_LIST_ID);
      if (existingList) {
        const currentIds = Array.isArray(existingList.contactIds) ? existingList.contactIds.map(String) : [];
        existingList.contactIds = Array.from(new Set([...currentIds, ...uniqueIds]));
        existingList.name = REPRINT_LIST_NAME;
        existingList.updatedAt = now;
      } else {
        state.lists.unshift({
          id: REPRINT_LIST_ID,
          name: REPRINT_LIST_NAME,
          contactIds: uniqueIds,
          createdAt: now,
          updatedAt: now,
        });
      }

      localStorage.setItem(storageKey, JSON.stringify(state));
      setResult({ added, updated, duplicates, invalid, total: uniqueIds.length });

      // El sincronizador de Mensajería revisa localStorage cada 900 ms.
      // Esperamos para que los cambios alcancen la nube antes de recargar la vista.
      window.setTimeout(() => window.location.reload(), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo importar el archivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ maxWidth: 980, margin: "16px auto 0", padding: "0 16px" }}>
      <div style={{ border: "1px solid #dbe3ea", borderRadius: 16, padding: 16, background: "#fff" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <strong style={{ display: "block", fontSize: 16 }}>Importación rápida de contactos</strong>
            <small style={{ color: "#64748b" }}>Acepta CSV con Nombre + Teléfono, Celular o WhatsApp. También reconoce Zona y Grupo.</small>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            style={{ border: 0, borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: busy ? "wait" : "pointer", background: "#0f3d67", color: "white" }}
          >
            {busy ? "Importando…" : "Cargar CSV"}
          </button>
          <input ref={inputRef} hidden type="file" accept=".csv,text/csv,text/plain" onChange={handleFile} />
        </div>
        {result && <p style={{ margin: "12px 0 0", color: "#166534" }}>
          {result.added} nuevos · {result.updated} ya existentes actualizados · {result.invalid} inválidos. Lista creada: <strong>{REPRINT_LIST_NAME}</strong>. Recargando…
        </p>}
        {error && <p style={{ margin: "12px 0 0", color: "#b91c1c" }}>{error}</p>}
        <small style={{ display: "block", marginTop: 10, color: "#64748b" }}>
          Los datos se guardan en tu espacio privado de Mensajería FGDLL; no se publican ni se almacenan en GitHub.
        </small>
      </div>
    </section>
  );
}
