"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "home" | "campaigns" | "contacts" | "templates" | "more" | "compose" | "runner" | "lists";
type ContactStatus = "active" | "inactive";
type RecipientStatus = "pending" | "sent" | "skipped" | "error";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  organization: string;
  group: string;
  zone: string;
  tags: string[];
  notes: string;
  status: ContactStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

type ContactList = {
  id: string;
  name: string;
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
};

type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

type CampaignRecipient = {
  id: string;
  contactId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  organization: string;
  group: string;
  zone: string;
  status: RecipientStatus;
  updatedAt: string;
};

type Campaign = {
  id: string;
  title: string;
  message: string;
  place: string;
  recipients: CampaignRecipient[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type AppState = {
  contacts: Contact[];
  lists: ContactList[];
  templates: MessageTemplate[];
  campaigns: Campaign[];
  settings: { defaultCountryCode: string };
};

type ContactHistoryEntry = {
  campaignId: string;
  campaignTitle: string;
  status: RecipientStatus;
  date: string;
};

const STORAGE_KEY = "fgdll-whatsapp-distributor-v1";
const emptyState: AppState = {
  contacts: [],
  lists: [],
  templates: [
    {
      id: "tpl-bienvenida",
      title: "Recordatorio breve",
      body: "Hola {nombre}, te comparto este recordatorio. Gracias por estar pendiente.",
      category: "Recordatorios",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  campaigns: [],
  settings: { defaultCountryCode: "52" },
};

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const cleanDigits = (value: string) => value.replace(/\D/g, "");

function normalizePhone(phone: string, countryCode: string, defaultCountryCode: string) {
  let digits = cleanDigits(phone);
  const code = cleanDigits(countryCode || defaultCountryCode);
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && code) return `${code}${digits}`;
  if (countryCode && !digits.startsWith(cleanDigits(countryCode))) return `${cleanDigits(countryCode)}${digits}`;
  return digits;
}

function phoneIssue(phone: string, countryCode: string, defaultCountryCode: string) {
  const raw = cleanDigits(phone);
  if (!raw) return "Sin teléfono";
  const normalized = normalizePhone(phone, countryCode, defaultCountryCode);
  if (normalized.length < 8) return "Número incompleto";
  if (normalized.length > 15) return "Número demasiado largo";
  if (raw.length === 10 && !countryCode && !defaultCountryCode) return "Falta código de país";
  return null;
}

function renderMessage(template: string, recipient: Pick<CampaignRecipient, "firstName" | "lastName" | "group" | "zone">, place = "") {
  const date = new Date();
  const values: Record<string, string> = {
    nombre: recipient.firstName || "",
    apellido: recipient.lastName || "",
    grupo: recipient.group || "",
    zona: recipient.zone || "",
    fecha: new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric" }).format(date),
    hora: new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(date),
    lugar: place || "",
  };
  return template.replace(/\{(nombre|apellido|grupo|zona|fecha|hora|lugar)\}/gi, (_, key: string) => values[key.toLowerCase()] ?? "");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseRows(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : lines[0].includes(";") ? ";" : ",";
  const split = (line: string) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const first = split(lines[0]).map((v) => v.toLowerCase());
  const hasHeader = first.some((v) => ["nombre", "name", "telefono", "teléfono", "phone", "celular"].includes(v));
  const rows = hasHeader ? lines.slice(1) : lines;
  const nameIndex = hasHeader ? Math.max(0, first.findIndex((v) => ["nombre", "name"].includes(v))) : 0;
  const lastIndex = hasHeader ? first.findIndex((v) => ["apellido", "lastname", "last name"].includes(v)) : -1;
  const phoneIndex = hasHeader ? first.findIndex((v) => ["telefono", "teléfono", "phone", "celular"].includes(v)) : 1;
  const zoneIndex = hasHeader ? first.findIndex((v) => ["zona", "zone"].includes(v)) : -1;
  const groupIndex = hasHeader ? first.findIndex((v) => ["grupo", "group"].includes(v)) : -1;
  return rows.map((line) => {
    const cells = split(line);
    return {
      firstName: cells[nameIndex] || "Sin nombre",
      lastName: lastIndex >= 0 ? cells[lastIndex] || "" : "",
      phone: phoneIndex >= 0 ? cells[phoneIndex] || "" : "",
      zone: zoneIndex >= 0 ? cells[zoneIndex] || "" : "",
      group: groupIndex >= 0 ? cells[groupIndex] || "" : "",
    };
  });
}

function progressFor(campaign: Campaign) {
  const sent = campaign.recipients.filter((r) => r.status === "sent").length;
  const pending = campaign.recipients.filter((r) => r.status === "pending" || r.status === "error").length;
  const processed = campaign.recipients.length - pending;
  const percent = campaign.recipients.length ? Math.round((processed / campaign.recipients.length) * 100) : 0;
  return { sent, pending, processed, percent, total: campaign.recipients.length };
}

function statusLabel(status: RecipientStatus) {
  if (status === "sent") return "Enviado";
  if (status === "skipped") return "Omitido";
  if (status === "error") return "Error";
  return "Pendiente";
}

function Icon({ name }: { name: "home" | "send" | "people" | "message" | "more" | "plus" | "search" | "back" | "check" }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></>,
    send: <><path d="m3 4 18 8-18 8 3-8-3-8Z"/><path d="M6 12h15"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6"/><path d="M15 6.5a3 3 0 0 1 0 5.8"/><path d="M16 14c2.7.4 4.2 2.4 4.5 5"/></>,
    message: <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg className="wa-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function DistributionApp({ storageNamespace }: { storageNamespace: string }) {
  const storageKey = useMemo(() => `${STORAGE_KEY}:${storageNamespace}`, [storageNamespace]);
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactZone, setContactZone] = useState("all");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composePlace, setComposePlace] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [quickNumbers, setQuickNumbers] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [runnerIndex, setRunnerIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReady(false);
    try {
      const saved = localStorage.getItem(storageKey);
      setState(saved ? { ...emptyState, ...JSON.parse(saved) } : emptyState);
    } catch {
      setState(emptyState);
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, ready, storageKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-whatsapp.js", { scope: "/administracion/envios/" }).catch(() => undefined);
  }, []);

  const activeContacts = useMemo(() => state.contacts.filter((c) => !c.archived), [state.contacts]);
  const zones = useMemo(() => Array.from(new Set(activeContacts.map((c) => c.zone).filter(Boolean))).sort(), [activeContacts]);
  const filteredContacts = useMemo(() => activeContacts.filter((c) => {
    const haystack = `${c.firstName} ${c.lastName} ${c.phone} ${c.group} ${c.zone} ${c.tags.join(" ")}`.toLowerCase();
    return (!contactSearch || haystack.includes(contactSearch.toLowerCase())) && (contactZone === "all" || c.zone === contactZone);
  }), [activeContacts, contactSearch, contactZone]);
  const activeCampaign = state.campaigns.find((c) => c.id === activeCampaignId) || null;
  const inProgress = state.campaigns.filter((c) => progressFor(c).pending > 0).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recent = [...state.campaigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  function flash(message: string) { setToast(message); }

  function go(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "");
    const countryCode = String(form.get("countryCode") || state.settings.defaultCountryCode);
    const normalized = normalizePhone(phone, countryCode, state.settings.defaultCountryCode);
    const duplicate = state.contacts.find((c) => c.id !== editingContactId && normalizePhone(c.phone, c.countryCode, state.settings.defaultCountryCode) === normalized && normalized);
    if (duplicate) { flash(`Ese número ya pertenece a ${duplicate.firstName}.`); return; }
    const payload = {
      firstName: String(form.get("firstName") || "").trim() || "Sin nombre",
      lastName: String(form.get("lastName") || "").trim(),
      phone: phone.trim(),
      countryCode: countryCode.trim(),
      organization: String(form.get("organization") || "").trim(),
      group: String(form.get("group") || "").trim(),
      zone: String(form.get("zone") || "").trim(),
      tags: String(form.get("tags") || "").split(",").map((v) => v.trim()).filter(Boolean),
      notes: String(form.get("notes") || "").trim(),
      status: String(form.get("status") || "active") as ContactStatus,
    };
    setState((current) => ({ ...current, contacts: editingContactId && editingContactId !== "new"
      ? current.contacts.map((c) => c.id === editingContactId ? { ...c, ...payload, updatedAt: now() } : c)
      : [{ id: uid("contact"), ...payload, archived: false, createdAt: now(), updatedAt: now(), lastMessageAt: null }, ...current.contacts] }));
    const wasEditing = editingContactId && editingContactId !== "new";
    setEditingContactId(null);
    event.currentTarget.reset();
    flash(wasEditing ? "Contacto actualizado." : "Contacto guardado.");
  }

  function archiveContact(id: string) {
    setState((current) => ({ ...current, contacts: current.contacts.map((c) => c.id === id ? { ...c, archived: true, updatedAt: now() } : c) }));
    setEditingContactId(null);
    flash("Contacto archivado.");
  }

  function importRows(rows: ReturnType<typeof parseRows>) {
    const known = new Set(state.contacts.map((c) => normalizePhone(c.phone, c.countryCode, state.settings.defaultCountryCode)).filter(Boolean));
    const additions: Contact[] = [];
    let duplicates = 0;
    let invalid = 0;
    for (const row of rows) {
      const normalized = normalizePhone(row.phone, "", state.settings.defaultCountryCode);
      if (!normalized || normalized.length < 8 || normalized.length > 15) { invalid++; continue; }
      if (known.has(normalized)) { duplicates++; continue; }
      known.add(normalized);
      additions.push({
        id: uid("contact"), firstName: row.firstName, lastName: row.lastName, phone: row.phone,
        countryCode: state.settings.defaultCountryCode, organization: "", group: row.group, zone: row.zone,
        tags: [], notes: "", status: "active", archived: false, createdAt: now(), updatedAt: now(), lastMessageAt: null,
      });
    }
    setState((current) => ({ ...current, contacts: [...additions.reverse(), ...current.contacts] }));
    setImportText("");
    setImportOpen(false);
    flash(`${additions.length} agregados · ${duplicates} duplicados · ${invalid} inválidos`);
  }

  function handleCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importRows(parseRows(String(reader.result || "")));
    reader.readAsText(file);
    event.target.value = "";
  }

  function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || "").trim() || "Mensaje sin título",
      body: String(form.get("body") || "").trim(),
      category: String(form.get("category") || "General").trim() || "General",
    };
    if (!payload.body) { flash("Escribe el mensaje."); return; }
    setState((current) => ({ ...current, templates: editingTemplateId && editingTemplateId !== "new"
      ? current.templates.map((t) => t.id === editingTemplateId ? { ...t, ...payload, updatedAt: now() } : t)
      : [{ id: uid("tpl"), ...payload, createdAt: now(), updatedAt: now() }, ...current.templates] }));
    setEditingTemplateId(null);
    event.currentTarget.reset();
    flash("Plantilla guardada.");
  }

  function saveList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const ids = form.getAll("contactIds").map(String);
    if (!name) { flash("Ponle un nombre a la lista."); return; }
    setState((current) => ({ ...current, lists: editingListId && editingListId !== "new"
      ? current.lists.map((list) => list.id === editingListId ? { ...list, name, contactIds: ids, updatedAt: now() } : list)
      : [{ id: uid("list"), name, contactIds: ids, createdAt: now(), updatedAt: now() }, ...current.lists] }));
    setEditingListId(null);
    event.currentTarget.reset();
    flash("Lista guardada.");
  }

  function startCompose(prefillListId = "") {
    setComposeTitle("");
    setComposeMessage("");
    setComposePlace("");
    setSelectedContactIds([]);
    setQuickNumbers("");
    setSelectedListId(prefillListId);
    setShowPreview(false);
    go("compose");
  }

  const composeRecipients = useMemo(() => {
    const fromIds = new Set(selectedContactIds);
    if (selectedListId) state.lists.find((list) => list.id === selectedListId)?.contactIds.forEach((id) => fromIds.add(id));
    const recipients: CampaignRecipient[] = activeContacts.filter((c) => fromIds.has(c.id)).map((c) => ({
      id: uid("r"), contactId: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone,
      countryCode: c.countryCode, organization: c.organization, group: c.group, zone: c.zone, status: "pending", updatedAt: now(),
    }));
    parseRows(quickNumbers.split(/\r?\n/).map((line) => line.includes(",") || line.includes("|") || line.includes("\t") ? line : `Contacto,${line}`).join("\n")).forEach((row) => {
      if (!cleanDigits(row.phone)) return;
      recipients.push({ id: uid("r"), contactId: null, firstName: row.firstName === "Contacto" ? "" : row.firstName, lastName: row.lastName, phone: row.phone, countryCode: state.settings.defaultCountryCode, organization: "", group: row.group, zone: row.zone, status: "pending", updatedAt: now() });
    });
    const unique = new Map<string, CampaignRecipient>();
    recipients.forEach((r) => {
      const key = normalizePhone(r.phone, r.countryCode, state.settings.defaultCountryCode);
      if (key && !unique.has(key)) unique.set(key, r);
    });
    return Array.from(unique.values());
  }, [selectedContactIds, selectedListId, quickNumbers, activeContacts, state.lists, state.settings.defaultCountryCode]);

  const composeIssues = useMemo(() => composeRecipients.map((r) => ({ recipient: r, issue: phoneIssue(r.phone, r.countryCode, state.settings.defaultCountryCode) })).filter((x) => x.issue), [composeRecipients, state.settings.defaultCountryCode]);

  function createCampaign() {
    if (!composeTitle.trim()) { flash("Ponle un nombre a la campaña."); return; }
    if (!composeMessage.trim()) { flash("Escribe o selecciona un mensaje."); return; }
    if (!composeRecipients.length) { flash("Selecciona al menos un destinatario."); return; }
    if (composeIssues.length) { flash("Corrige los teléfonos inválidos antes de comenzar."); return; }
    const campaign: Campaign = { id: uid("campaign"), title: composeTitle.trim(), message: composeMessage.trim(), place: composePlace.trim(), recipients: composeRecipients, createdAt: now(), updatedAt: now(), completedAt: null };
    setState((current) => ({ ...current, campaigns: [campaign, ...current.campaigns] }));
    setActiveCampaignId(campaign.id);
    setRunnerIndex(0);
    go("runner");
  }

  function openCampaign(id: string) {
    const campaign = state.campaigns.find((c) => c.id === id);
    if (!campaign) return;
    const firstPending = campaign.recipients.findIndex((r) => r.status === "pending" || r.status === "error");
    setActiveCampaignId(id);
    setRunnerIndex(firstPending >= 0 ? firstPending : 0);
    go("runner");
  }

  function updateRecipient(status: RecipientStatus) {
    if (!activeCampaign) return;
    const recipient = activeCampaign.recipients[runnerIndex];
    if (!recipient) return;
    const stamp = now();
    setState((current) => {
      const campaigns = current.campaigns.map((campaign) => {
        if (campaign.id !== activeCampaign.id) return campaign;
        const recipients = campaign.recipients.map((r, index) => index === runnerIndex ? { ...r, status, updatedAt: stamp } : r);
        const remains = recipients.some((r) => r.status === "pending" || r.status === "error");
        return { ...campaign, recipients, updatedAt: stamp, completedAt: remains ? null : stamp };
      });
      const contacts = status === "sent" && recipient.contactId ? current.contacts.map((c) => c.id === recipient.contactId ? { ...c, lastMessageAt: stamp, updatedAt: stamp } : c) : current.contacts;
      return { ...current, campaigns, contacts };
    });
    if (status !== "pending" && status !== "error") {
      const later = activeCampaign.recipients.findIndex((r, index) => index > runnerIndex && (r.status === "pending" || r.status === "error"));
      const earlier = activeCampaign.recipients.findIndex((r) => r.status === "pending" || r.status === "error");
      setRunnerIndex(later >= 0 ? later : earlier >= 0 ? earlier : runnerIndex);
    }
    if (status === "error") flash("Marcado con error. Puedes reintentarlo después.");
  }

  function openWhatsApp() {
    if (!activeCampaign) return;
    const recipient = activeCampaign.recipients[runnerIndex];
    if (!recipient) return;
    const number = normalizePhone(recipient.phone, recipient.countryCode, state.settings.defaultCountryCode);
    const message = renderMessage(activeCampaign.message, recipient, activeCampaign.place);
    window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function exportBackup() {
    downloadText(`fgdll-envios-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json;charset=utf-8");
    flash("Respaldo descargado.");
  }

  function exportContactsCsv() {
    const header = "Nombre,Apellido,Telefono,CodigoPais,Organizacion,Grupo,Zona,Etiquetas,Estado,UltimoMensaje";
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = state.contacts.map((c) => [c.firstName, c.lastName, c.phone, c.countryCode, c.organization, c.group, c.zone, c.tags.join(";"), c.status, c.lastMessageAt || ""].map(escape).join(","));
    downloadText(`contactos-fgdll-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows].join("\n"), "text/csv;charset=utf-8");
  }

  if (!ready) return <main className="wa-app wa-loading">Cargando asistente de distribución…</main>;

  const stats = {
    campaigns: state.campaigns.length,
    managed: state.campaigns.reduce((sum, c) => sum + c.recipients.filter((r) => r.status === "sent").length, 0),
    pending: state.campaigns.reduce((sum, c) => sum + c.recipients.filter((r) => r.status === "pending" || r.status === "error").length, 0),
    reached: new Set(state.campaigns.flatMap((c) => c.recipients.filter((r) => r.status === "sent").map((r) => normalizePhone(r.phone, r.countryCode, state.settings.defaultCountryCode)))).size,
  };

  const editingContact = state.contacts.find((c) => c.id === editingContactId);
  const editingTemplate = state.templates.find((t) => t.id === editingTemplateId);
  const editingList = state.lists.find((l) => l.id === editingListId);
  const editingHistory: ContactHistoryEntry[] = editingContact ? state.campaigns.flatMap((campaign) => campaign.recipients
    .filter((recipient) => recipient.contactId === editingContact.id)
    .map((recipient) => ({ campaignId: campaign.id, campaignTitle: campaign.title, status: recipient.status, date: recipient.updatedAt })))
    .sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <main className="wa-app">
      {toast && <div className="wa-toast" role="status">{toast}</div>}
      <header className="wa-topbar">
        <div>
          <span className="wa-kicker">FGDLL · ASISTENTE DE DISTRIBUCIÓN</span>
          <strong>{view === "home" ? "Mensajería" : view === "campaigns" ? "Envíos" : view === "contacts" ? "Contactos" : view === "templates" ? "Mensajes" : view === "lists" ? "Listas" : view === "compose" ? "Nuevo envío" : view === "runner" ? "Distribución" : "Más"}</strong>
        </div>
        {view !== "home" && !["contacts", "campaigns", "templates", "more"].includes(view) && <button className="wa-icon-button" onClick={() => go(view === "runner" ? "campaigns" : "home")} aria-label="Volver"><Icon name="back" /></button>}
      </header>

      <section className="wa-screen">
        {view === "home" && <>
          <div className="wa-hero">
            <span>¿QUÉ QUIERES HACER?</span>
            <h1>Escribe una vez.<br />Recórrelos uno por uno.</h1>
            <p>Prepara el mensaje, selecciona personas y lleva el control sin automatizar el envío.</p>
            <button className="wa-primary wa-xl" onClick={() => startCompose()}><Icon name="plus" /> NUEVO ENVÍO</button>
          </div>

          {inProgress.length > 0 && <section className="wa-section">
            <div className="wa-section-title"><div><span>EN PROCESO</span><h2>Continúa donde te quedaste</h2></div></div>
            <div className="wa-stack">{inProgress.slice(0, 4).map((campaign) => {
              const p = progressFor(campaign);
              return <button className="wa-campaign-card" key={campaign.id} onClick={() => openCampaign(campaign.id)}>
                <div><strong>{campaign.title}</strong><span>{p.sent} de {p.total} enviados</span></div>
                <div className="wa-progress"><i style={{ width: `${p.percent}%` }} /></div>
                <b>Continuar →</b>
              </button>;
            })}</div>
          </section>}

          <section className="wa-section">
            <div className="wa-quick-grid">
              <button onClick={() => go("campaigns")}><Icon name="send" /><strong>Continuar envío</strong><span>Campañas y progreso</span></button>
              <button onClick={() => go("contacts")}><Icon name="people" /><strong>Contactos</strong><span>{activeContacts.length} disponibles</span></button>
              <button onClick={() => go("templates")}><Icon name="message" /><strong>Mensajes</strong><span>{state.templates.length} plantillas</span></button>
              <button onClick={() => go("lists")}><span className="wa-list-symbol">≡</span><strong>Listas</strong><span>{state.lists.length} creadas</span></button>
            </div>
          </section>

          {recent.length > 0 && <section className="wa-section">
            <div className="wa-section-title"><div><span>RECIENTES</span><h2>Últimos movimientos</h2></div></div>
            <div className="wa-rows">{recent.map((campaign) => {
              const p = progressFor(campaign);
              return <button key={campaign.id} onClick={() => openCampaign(campaign.id)}><div><strong>{campaign.title}</strong><span>{new Date(campaign.updatedAt).toLocaleDateString("es-MX")}</span></div><b>{p.sent}/{p.total}</b></button>;
            })}</div>
          </section>}
        </>}

        {view === "campaigns" && <>
          <div className="wa-page-heading"><span>CAMPAÑAS</span><h1>Todo envío conserva su progreso.</h1><p>Cierra la aplicación cuando quieras. El siguiente pendiente seguirá esperándote.</p></div>
          <button className="wa-primary wa-full" onClick={() => startCompose()}><Icon name="plus" /> Nuevo envío</button>
          <div className="wa-stack wa-space-top">{state.campaigns.length === 0 ? <Empty title="Aún no hay campañas" text="Crea tu primer envío y aquí aparecerá su progreso." /> : [...state.campaigns].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map((campaign) => {
            const p = progressFor(campaign);
            return <article className="wa-campaign-detail" key={campaign.id}>
              <div className="wa-card-head"><div><span>{p.pending ? "EN PROCESO" : "COMPLETADA"}</span><h3>{campaign.title}</h3></div><b>{p.percent}%</b></div>
              <div className="wa-progress"><i style={{ width: `${p.percent}%` }} /></div>
              <div className="wa-counters"><span><b>{p.sent}</b> enviados</span><span><b>{p.pending}</b> pendientes</span><span><b>{p.total}</b> total</span></div>
              <button className="wa-secondary wa-full" onClick={() => openCampaign(campaign.id)}>{p.pending ? "Continuar campaña" : "Ver historial"} →</button>
            </article>;
          })}</div>
        </>}

        {view === "contacts" && <>
          <div className="wa-page-heading compact"><span>MIS CONTACTOS</span><h1>Personas, no conversaciones.</h1><p>La app guarda tus datos de contacto y tu historial de gestión. No lee WhatsApp.</p></div>
          <div className="wa-toolbar">
            <label className="wa-search"><Icon name="search" /><input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Buscar nombre, grupo, teléfono…" /></label>
            <select value={contactZone} onChange={(e) => setContactZone(e.target.value)}><option value="all">Todas las zonas</option>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select>
          </div>
          <div className="wa-action-row"><button className="wa-primary" onClick={() => setEditingContactId("new")}><Icon name="plus" /> Agregar</button><button className="wa-secondary" onClick={() => setImportOpen(true)}>Importar</button></div>

          {(editingContactId || importOpen) && <div className="wa-modal-backdrop" onClick={() => { setEditingContactId(null); setImportOpen(false); }}>
            <div className="wa-sheet" onClick={(e) => e.stopPropagation()}>
              {importOpen ? <>
                <div className="wa-sheet-head"><div><span>IMPORTAR</span><h2>Pega o carga contactos</h2></div><button onClick={() => setImportOpen(false)}>×</button></div>
                <p className="wa-help">Acepta CSV o texto con columnas Nombre y Teléfono. También puedes usar tabulaciones o el separador |.</p>
                <textarea className="wa-big-textarea" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={"Nombre | Teléfono | Zona | Grupo\nLaura | 9991234567 | Jaguar | La Cuna\nPedro | 9997654321 | Tiburón | Amanecer"} />
                <div className="wa-sheet-actions"><button className="wa-secondary" onClick={() => fileInput.current?.click()}>Cargar CSV</button><button className="wa-primary" onClick={() => importRows(parseRows(importText))}>Revisar e importar</button></div>
                <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" hidden onChange={handleCsv} />
              </> : <ContactForm contact={editingContactId === "new" ? undefined : editingContact} history={editingContactId === "new" ? [] : editingHistory} defaultCode={state.settings.defaultCountryCode} onSubmit={saveContact} onClose={() => setEditingContactId(null)} onArchive={editingContact ? () => archiveContact(editingContact.id) : undefined} />}
            </div>
          </div>}

          <div className="wa-contact-list wa-space-top">{filteredContacts.length === 0 ? <Empty title="Sin contactos" text="Agrega uno manualmente o importa una lista." /> : filteredContacts.map((contact) => {
            const issue = phoneIssue(contact.phone, contact.countryCode, state.settings.defaultCountryCode);
            return <button key={contact.id} className="wa-contact-row" onClick={() => setEditingContactId(contact.id)}>
              <span className="wa-avatar">{(contact.firstName[0] || "?").toUpperCase()}</span>
              <div><strong>{contact.firstName} {contact.lastName}</strong><span>{contact.zone || contact.group || "Sin grupo"} · +{normalizePhone(contact.phone, contact.countryCode, state.settings.defaultCountryCode)}</span>{issue && <small>{issue}</small>}</div>
              <b>›</b>
            </button>;
          })}</div>
        </>}

        {view === "templates" && <>
          <div className="wa-page-heading compact"><span>MIS MENSAJES</span><h1>Plantillas listas para reutilizar.</h1><p>Usa variables para mantener el mensaje humano sin reescribirlo persona por persona.</p></div>
          <button className="wa-primary wa-full" onClick={() => setEditingTemplateId("new")}><Icon name="plus" /> Nueva plantilla</button>
          {editingTemplateId && <div className="wa-modal-backdrop" onClick={() => setEditingTemplateId(null)}><div className="wa-sheet" onClick={(e) => e.stopPropagation()}><TemplateForm template={editingTemplateId === "new" ? undefined : editingTemplate} onSubmit={saveTemplate} onClose={() => setEditingTemplateId(null)} /></div></div>}
          <div className="wa-stack wa-space-top">{state.templates.map((template) => <button className="wa-template-card" key={template.id} onClick={() => setEditingTemplateId(template.id)}><span>{template.category}</span><strong>{template.title}</strong><p>{template.body}</p><b>Editar →</b></button>)}</div>
        </>}

        {view === "lists" && <>
          <div className="wa-page-heading compact"><span>LISTAS</span><h1>Selecciona grupos completos en segundos.</h1><p>Un contacto puede aparecer en varias listas sin duplicarse en una campaña.</p></div>
          <button className="wa-primary wa-full" onClick={() => setEditingListId("new")}><Icon name="plus" /> Nueva lista</button>
          {editingListId && <div className="wa-modal-backdrop" onClick={() => setEditingListId(null)}><div className="wa-sheet" onClick={(e) => e.stopPropagation()}><ListForm list={editingListId === "new" ? undefined : editingList} contacts={activeContacts} onSubmit={saveList} onClose={() => setEditingListId(null)} /></div></div>}
          <div className="wa-stack wa-space-top">{state.lists.length === 0 ? <Empty title="Sin listas" text="Crea Líderes, Zona Jaguar, Centros o cualquier conjunto que uses seguido." /> : state.lists.map((list) => <article className="wa-list-card" key={list.id}><div><span>LISTA</span><h3>{list.name}</h3><p>{list.contactIds.filter((id) => activeContacts.some((c) => c.id === id)).length} contactos</p></div><div className="wa-inline-buttons"><button onClick={() => startCompose(list.id)}>Enviar</button><button onClick={() => setEditingListId(list.id)}>Editar</button></div></article>)}</div>
        </>}

        {view === "compose" && <>
          <div className="wa-page-heading compact"><span>NUEVO ENVÍO</span><h1>Prepara la campaña.</h1><p>Selecciona destinatarios, escribe una vez y revisa la personalización antes de comenzar.</p></div>
          <div className="wa-form-stack">
            <label className="wa-field"><span>Nombre de la campaña</span><input value={composeTitle} onChange={(e) => setComposeTitle(e.target.value)} placeholder="Ej. Aviso líderes septiembre" /></label>
            <div className="wa-field"><span>Destinatarios</span>
              <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}><option value="">Seleccionar una lista (opcional)</option>{state.lists.map((list) => <option value={list.id} key={list.id}>{list.name} · {list.contactIds.length}</option>)}</select>
              {activeContacts.length > 0 && <div className="wa-select-tools"><button type="button" onClick={() => setSelectedContactIds(activeContacts.map((contact) => contact.id))}>Seleccionar todos</button><button type="button" onClick={() => setSelectedContactIds([])}>Limpiar selección</button></div>}
              <div className="wa-recipient-picker">{activeContacts.map((contact) => <label key={contact.id}><input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={(e) => setSelectedContactIds((ids) => e.target.checked ? [...ids, contact.id] : ids.filter((id) => id !== contact.id))} /><span><b>{contact.firstName} {contact.lastName}</b><small>{contact.zone || contact.group || normalizePhone(contact.phone, contact.countryCode, state.settings.defaultCountryCode)}</small></span></label>)}</div>
            </div>
            <label className="wa-field"><span>Envío rápido · números sin guardar</span><textarea value={quickNumbers} onChange={(e) => setQuickNumbers(e.target.value)} placeholder={"9991234567\n9992345678\n9993456789"} /></label>
            <label className="wa-field"><span>Plantilla guardada</span><select defaultValue="" onChange={(e) => { const template = state.templates.find((t) => t.id === e.target.value); if (template) setComposeMessage(template.body); }}><option value="">Escribir desde cero</option>{state.templates.map((template) => <option value={template.id} key={template.id}>{template.title}</option>)}</select></label>
            <label className="wa-field"><span>Mensaje</span><textarea className="wa-message-box" value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} placeholder="Hola {nombre}, te comparto la información…" /></label>
            <div className="wa-vars"><span>Insertar:</span>{["{nombre}","{apellido}","{grupo}","{zona}","{fecha}","{hora}","{lugar}"].map((v) => <button type="button" key={v} onClick={() => setComposeMessage((m) => `${m}${m && !m.endsWith(" ") ? " " : ""}${v}`)}>{v}</button>)}</div>
            <label className="wa-field"><span>Lugar (para variable {"{lugar}"})</span><input value={composePlace} onChange={(e) => setComposePlace(e.target.value)} placeholder="Ej. La Cuna, Mérida" /></label>
          </div>
          <div className="wa-compose-summary"><div><span>DESTINATARIOS ÚNICOS</span><strong>{composeRecipients.length}</strong></div><div><span>ADVERTENCIAS</span><strong className={composeIssues.length ? "danger" : ""}>{composeIssues.length}</strong></div></div>
          {composeIssues.length > 0 && <div className="wa-warning-box"><strong>Corrige antes de comenzar</strong>{composeIssues.slice(0,5).map(({recipient, issue}) => <span key={recipient.id}>{recipient.firstName || recipient.phone}: {issue}</span>)}</div>}
          <button className="wa-secondary wa-full" disabled={!composeRecipients.length || !composeMessage.trim()} onClick={() => setShowPreview(!showPreview)}>Vista previa personalizada</button>
          {showPreview && composeRecipients[0] && <div className="wa-preview-card"><span>VISTA PREVIA · {composeRecipients[0].firstName || composeRecipients[0].phone}</span><p>{renderMessage(composeMessage, composeRecipients[0], composePlace)}</p></div>}
          <button className="wa-primary wa-full wa-xl" onClick={createCampaign}>COMENZAR · {composeRecipients.length}</button>
        </>}

        {view === "runner" && activeCampaign && (() => {
          const recipient = activeCampaign.recipients[runnerIndex];
          const p = progressFor(activeCampaign);
          if (!recipient) return <Empty title="Campaña vacía" text="No hay destinatarios en este envío." />;
          const rendered = renderMessage(activeCampaign.message, recipient, activeCampaign.place);
          const number = normalizePhone(recipient.phone, recipient.countryCode, state.settings.defaultCountryCode);
          const done = p.pending === 0;
          return <>
            <div className="wa-runner-top"><div><span>{activeCampaign.title.toUpperCase()}</span><strong>{p.sent} DE {p.total} ENVIADOS</strong></div><b>{p.percent}%</b></div>
            <div className="wa-progress runner"><i style={{ width: `${p.percent}%` }} /></div>
            {done && <div className="wa-done-card"><span className="wa-done-check"><Icon name="check" /></span><h1>Campaña terminada.</h1><p>{p.sent} enviados · {activeCampaign.recipients.filter((r) => r.status === "skipped").length} omitidos.</p><button className="wa-primary" onClick={() => go("campaigns")}>Volver a campañas</button></div>}
            {!done && <>
              <article className="wa-recipient-focus">
                <span className="wa-step">{runnerIndex + 1} DE {p.total}</span>
                <div className="wa-avatar xl">{(recipient.firstName[0] || "#").toUpperCase()}</div>
                <h1>{recipient.firstName || "Contacto"} {recipient.lastName}</h1>
                <a href={`tel:+${number}`}>+{number}</a>
                <div className={`wa-status-pill ${recipient.status}`}>{statusLabel(recipient.status)}</div>
              </article>
              <div className="wa-message-preview"><span>MENSAJE PREPARADO</span><p>{rendered}</p><button onClick={async () => { await copyText(rendered); flash("Mensaje copiado."); }}>Copiar mensaje</button></div>
              <button className="wa-whatsapp wa-full wa-xl" onClick={openWhatsApp}>ABRIR EN WHATSAPP</button>
              <button className="wa-primary wa-full wa-xl" onClick={() => updateRecipient("sent")}><Icon name="check" /> MARCAR ENVIADO Y SIGUIENTE</button>
              <div className="wa-runner-actions"><button onClick={() => updateRecipient("skipped")}>Omitir</button><button onClick={() => updateRecipient("error")}>Error</button><button disabled={runnerIndex === 0} onClick={() => setRunnerIndex((index) => Math.max(0, index - 1))}>Atrás</button><button onClick={() => updateRecipient("pending")}>Volver a pendiente</button></div>
              <details className="wa-recipient-queue"><summary>Ver cola de destinatarios</summary>{activeCampaign.recipients.map((r, index) => <button className={index === runnerIndex ? "active" : ""} key={r.id} onClick={() => setRunnerIndex(index)}><span>{index + 1}. {r.firstName || r.phone}</span><b>{r.status === "sent" ? "✓" : r.status === "skipped" ? "→" : r.status === "error" ? "!" : "○"}</b></button>)}</details>
            </>}
          </>;
        })()}

        {view === "more" && <>
          <div className="wa-page-heading compact"><span>CONFIGURACIÓN</span><h1>Privacidad y respaldo.</h1><p>Tus contactos, listas, plantillas y campañas se sincronizan con tu cuenta del portal y conservan una copia local si la conexión falla.</p></div>
          <section className="wa-settings-card"><label className="wa-field"><span>Código de país predeterminado</span><div className="wa-prefix-input"><b>+</b><input inputMode="numeric" value={state.settings.defaultCountryCode} onChange={(e) => setState((current) => ({ ...current, settings: { ...current.settings, defaultCountryCode: cleanDigits(e.target.value) } }))} /></div><small>México: 52. Se usa cuando pegas números de 10 dígitos.</small></label></section>
          <section className="wa-stats-grid"><div><strong>{stats.campaigns}</strong><span>Campañas</span></div><div><strong>{stats.managed}</strong><span>Enviados</span></div><div><strong>{stats.pending}</strong><span>Pendientes</span></div><div><strong>{stats.reached}</strong><span>Contactos alcanzados</span></div></section>
          <section className="wa-settings-card"><h3>Tus datos</h3><button className="wa-secondary wa-full" onClick={exportContactsCsv}>Exportar contactos CSV</button><button className="wa-secondary wa-full" onClick={exportBackup}>Descargar respaldo completo</button><button className="wa-danger wa-full" onClick={() => { if (window.confirm("Esto eliminará contactos, listas, plantillas y campañas sincronizados para esta cuenta en todos tus dispositivos. No se puede deshacer.")) { localStorage.removeItem(storageKey); setState(emptyState); flash("Datos vaciados. Espera a que termine la sincronización."); } }}>Eliminar todos los datos</button></section>
          <section className="wa-privacy-note"><strong>Qué no hace esta app</strong><p>No lee tus chats, no pulsa Enviar, no automatiza WhatsApp y no almacena conversaciones privadas. El envío final siempre depende de ti.</p></section>
        </>}
      </section>

      {!(["compose", "runner", "lists"].includes(view)) && <button className="wa-floating-new" onClick={() => startCompose()} aria-label="Nuevo envío"><Icon name="plus" /></button>}
      {!(["compose", "runner", "lists"].includes(view)) && <nav className="wa-bottom-nav" aria-label="Navegación principal">
        <button className={view === "home" ? "active" : ""} onClick={() => go("home")}><Icon name="home" /><span>Inicio</span></button>
        <button className={view === "campaigns" ? "active" : ""} onClick={() => go("campaigns")}><Icon name="send" /><span>Envíos</span></button>
        <button className={view === "contacts" ? "active" : ""} onClick={() => go("contacts")}><Icon name="people" /><span>Contactos</span></button>
        <button className={view === "templates" ? "active" : ""} onClick={() => go("templates")}><Icon name="message" /><span>Mensajes</span></button>
        <button className={view === "more" ? "active" : ""} onClick={() => go("more")}><Icon name="more" /><span>Más</span></button>
      </nav>}
    </main>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="wa-empty"><span>○</span><strong>{title}</strong><p>{text}</p></div>;
}

function ContactForm({ contact, history, defaultCode, onSubmit, onClose, onArchive }: { contact?: Contact; history: ContactHistoryEntry[]; defaultCode: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; onArchive?: () => void }) {
  return <form onSubmit={onSubmit}>
    <div className="wa-sheet-head"><div><span>CONTACTO</span><h2>{contact ? "Editar contacto" : "Nuevo contacto"}</h2></div><button type="button" onClick={onClose}>×</button></div>
    <div className="wa-form-grid two"><label className="wa-field"><span>Nombre</span><input name="firstName" defaultValue={contact?.firstName} required /></label><label className="wa-field"><span>Apellido</span><input name="lastName" defaultValue={contact?.lastName} /></label></div>
    <div className="wa-form-grid phone"><label className="wa-field"><span>País</span><div className="wa-prefix-input"><b>+</b><input name="countryCode" inputMode="numeric" defaultValue={contact?.countryCode || defaultCode} /></div></label><label className="wa-field"><span>Teléfono</span><input name="phone" inputMode="tel" defaultValue={contact?.phone} placeholder="9991234567" required /></label></div>
    <label className="wa-field"><span>Organización</span><input name="organization" defaultValue={contact?.organization} /></label>
    <div className="wa-form-grid two"><label className="wa-field"><span>Grupo</span><input name="group" defaultValue={contact?.group} /></label><label className="wa-field"><span>Zona</span><input name="zone" defaultValue={contact?.zone} /></label></div>
    <label className="wa-field"><span>Etiquetas</span><input name="tags" defaultValue={contact?.tags.join(", ")} placeholder="Líder, activo, consejo" /></label>
    <label className="wa-field"><span>Notas</span><textarea name="notes" defaultValue={contact?.notes} /></label>
    <label className="wa-field"><span>Estado</span><select name="status" defaultValue={contact?.status || "active"}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
    {contact && <div className="wa-contact-history"><div><span>HISTORIAL</span><strong>{history.length} comunicaciones gestionadas</strong></div>{history.length === 0 ? <p>Aún no hay envíos registrados para este contacto.</p> : history.slice(0, 10).map((entry) => <button type="button" key={`${entry.campaignId}-${entry.date}`} className="wa-history-row"><span><b>{entry.campaignTitle}</b><small>{new Date(entry.date).toLocaleString("es-MX")}</small></span><em className={entry.status}>{statusLabel(entry.status)}</em></button>)}</div>}
    <div className="wa-sheet-actions">{onArchive && <button className="wa-danger" type="button" onClick={onArchive}>Archivar</button>}<button className="wa-primary" type="submit">Guardar contacto</button></div>
  </form>;
}

function TemplateForm({ template, onSubmit, onClose }: { template?: MessageTemplate; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <form onSubmit={onSubmit}>
    <div className="wa-sheet-head"><div><span>PLANTILLA</span><h2>{template ? "Editar mensaje" : "Nuevo mensaje"}</h2></div><button type="button" onClick={onClose}>×</button></div>
    <label className="wa-field"><span>Título interno</span><input name="title" defaultValue={template?.title} required /></label>
    <label className="wa-field"><span>Categoría</span><input name="category" defaultValue={template?.category || "General"} /></label>
    <label className="wa-field"><span>Texto</span><textarea name="body" className="wa-big-textarea" defaultValue={template?.body} placeholder="Hola {nombre}, te comparto…" required /></label>
    <p className="wa-help">Variables disponibles: {"{nombre} {apellido} {grupo} {zona} {fecha} {hora} {lugar}"}</p>
    <div className="wa-sheet-actions"><button type="button" className="wa-secondary" onClick={onClose}>Cancelar</button><button className="wa-primary" type="submit">Guardar</button></div>
  </form>;
}

function ListForm({ list, contacts, onSubmit, onClose }: { list?: ContactList; contacts: Contact[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <form onSubmit={onSubmit}>
    <div className="wa-sheet-head"><div><span>LISTA</span><h2>{list ? "Editar lista" : "Nueva lista"}</h2></div><button type="button" onClick={onClose}>×</button></div>
    <label className="wa-field"><span>Nombre</span><input name="name" defaultValue={list?.name} placeholder="Ej. Líderes Zona Jaguar" required /></label>
    <div className="wa-field"><span>Contactos</span><div className="wa-recipient-picker tall">{contacts.map((contact) => <label key={contact.id}><input name="contactIds" value={contact.id} type="checkbox" defaultChecked={list?.contactIds.includes(contact.id)} /><span><b>{contact.firstName} {contact.lastName}</b><small>{contact.zone || contact.group || contact.phone}</small></span></label>)}</div></div>
    <div className="wa-sheet-actions"><button type="button" className="wa-secondary" onClick={onClose}>Cancelar</button><button className="wa-primary" type="submit">Guardar lista</button></div>
  </form>;
}

