"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type Topic = {
  id: string; titulo: string; tituloCorto?: string; categoria?: string; intensidad?: string;
  momento?: string; objetivo?: string; fraseAncla?: string; desarrollo?: string; etiquetas?: string[];
  palabrasClave?: string[]; pasos?: string[]; guiaTestimonio?: { detectar?: string[]; admitir?: string[]; corregir?: string[] };
  advertenciaEtica?: string; advertenciaLider?: string; noUsarPara?: string[]; status: string;
  origin: string; fileName: string; updatedAt: string;
};
type Material = {
  id: string; title: string; category: string; description: string; versionLabel: string;
  fileName: string; status: string; sortOrder: number; updatedAt: string;
};
type Announcement = {
  id: string; title: string; summary: string; body: string; priority: string;
  audience: string; status: string; publishedAt: string | null; updatedAt: string;
};
type InboxItem = {
  id: string; kind: string; area: string; title: string; contactName: string; email: string;
  phone: string; status: string; createdAt: string; updatedAt: string; href: string; priority: string; itemKey: string;
};
type InboxData = { items: InboxItem[]; summary: { total: number; urgent: number; byArea: Record<string, number> } };
type EditorKind = "topic" | "material" | "announcement";
type DeleteTarget = { kind: EditorKind; id: string; title: string };

const emptyTopic = {
  id: "", title: "", shortTitle: "", category: "General", intensity: "Media", moment: "Mitad",
  objective: "", anchor: "", development: "", tags: "", keywords: "", steps: "", detect: "",
  admit: "", correct: "", ethicsNote: "", leaderNote: "", notFor: "", status: "published",
};
const emptyMaterial = {
  id: "", title: "", category: "protocolos", description: "", versionLabel: "", sortOrder: "100", status: "published",
};
const emptyAnnouncement = {
  id: "", title: "", summary: "", body: "", priority: "info", audience: "all", status: "published",
};

const categoryLabels: Record<string, string> = {
  protocolos: "Protocolos", responsivas: "Responsivas", reglamentos: "Reglamentos",
  formatos: "Formatos", experiencias: "Experiencias", otros: "Otros",
};
const statusLabels: Record<string, string> = { published: "Publicado", draft: "Borrador", archived: "Archivado" };
const audienceLabels: Record<string, string> = {
  all: "Todos los usuarios", member: "Miembros generales", leader: "Líderes", osg: "OSG", delegate: "Delegados", council: "Consejo",
};
const requestStatusLabels: Record<string, string> = {
  pending: "Pendiente", in_review: "En revisión", changes_requested: "Esperando corrección", new: "Nueva",
  contacted: "Contactada", oriented: "Orientada", referred: "Canalizada", received: "Recibida",
  screening: "Valoración", investigation: "Investigación", resolution: "Resolución", pending_validation: "Por validar",
  approved: "Aprobada", ready: "Lista", pending_print: "Por imprimir", pending_send: "Por enviar",
  ready_delivery: "Por entregar",
};

async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

function friendlyDate(value: string) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function ContentAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [inbox, setInbox] = useState<InboxData>({ items: [], summary: { total: 0, urgent: 0, byArea: {} } });
  const [tab, setTab] = useState<"topics" | "materials" | "announcements">(() => (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "announcements"
      ? "announcements"
      : "topics"
  ));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function load(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const me = await fetch("/api/portal/me", { cache: "no-store" }).then(jsonResponse);
      const admin = me.profile?.role === "admin";
      setIsAdmin(admin);
      if (!admin) return;
      const [topicData, materialData, announcementData, inboxData] = await Promise.all([
        fetch("/api/content/testimonies?admin=1", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/content/materials?admin=1", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/announcements?admin=1", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/admin/inbox", { cache: "no-store" }).then(jsonResponse),
      ]);
      setTopics(topicData.topics || []);
      setMaterials(materialData.materials || []);
      setAnnouncements(announcementData.announcements || []);
      setInbox(inboxData || { items: [], summary: { total: 0, urgent: 0, byArea: {} } });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el centro de contenidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const filteredTopics = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return topics.filter((item) => !term || `${item.titulo} ${item.categoria} ${item.fileName}`.toLocaleLowerCase("es").includes(term));
  }, [topics, search]);
  const filteredMaterials = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return materials.filter((item) => !term || `${item.title} ${item.category} ${item.fileName}`.toLocaleLowerCase("es").includes(term));
  }, [materials, search]);
  const filteredAnnouncements = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return announcements.filter((item) => !term || `${item.title} ${item.summary} ${item.body}`.toLocaleLowerCase("es").includes(term));
  }, [announcements, search]);
  const filteredInbox = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return inbox.items.filter((item) => !term || `${item.area} ${item.title} ${item.contactName} ${item.email} ${item.phone} ${item.id}`.toLocaleLowerCase("es").includes(term));
  }, [inbox.items, search]);

  function openNew(kind: EditorKind) {
    setEditorKind(kind);
    setDraft(kind === "topic" ? emptyTopic : kind === "material" ? emptyMaterial : emptyAnnouncement);
    setFile(null);
    setError("");
  }

  function editTopic(item: Topic) {
    setEditorKind("topic");
    setDraft({
      id: item.id, title: item.titulo, shortTitle: item.tituloCorto || "", category: item.categoria || "General",
      intensity: item.intensidad || "Media", moment: item.momento || "Mitad", objective: item.objetivo || "",
      anchor: item.fraseAncla || "", development: item.desarrollo || "", tags: (item.etiquetas || []).join(", "),
      keywords: (item.palabrasClave || []).join(", "), steps: (item.pasos || []).join(", "),
      detect: (item.guiaTestimonio?.detectar || []).join("\n"), admit: (item.guiaTestimonio?.admitir || []).join("\n"),
      correct: (item.guiaTestimonio?.corregir || []).join("\n"), ethicsNote: item.advertenciaEtica || "",
      leaderNote: item.advertenciaLider || "", notFor: (item.noUsarPara || []).join("\n"), status: item.status,
    });
    setFile(null);
  }

  function editMaterial(item: Material) {
    setEditorKind("material");
    setDraft({ id: item.id, title: item.title, category: item.category, description: item.description, versionLabel: item.versionLabel, sortOrder: String(item.sortOrder), status: item.status });
    setFile(null);
  }

  function editAnnouncement(item: Announcement) {
    setEditorKind("announcement");
    setDraft({ id: item.id, title: item.title, summary: item.summary, body: item.body, priority: item.priority, audience: item.audience, status: item.status === "published" ? "published" : "draft" });
    setFile(null);
  }

  function updateDraft(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editorKind) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editorKind === "announcement") {
        await fetch("/api/announcements", {
          method: draft.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        }).then(jsonResponse);
      } else {
        const formData = new FormData();
        Object.entries(draft).forEach(([key, value]) => formData.set(key, value));
        if (file) formData.set("file", file);
        const endpoint = editorKind === "topic" ? "/api/content/testimonies" : "/api/content/materials";
        await fetch(endpoint, { method: draft.id ? "PATCH" : "POST", body: formData }).then(jsonResponse);
      }
      setEditorKind(null);
      setFile(null);
      setNotice(draft.id ? "Los cambios quedaron guardados." : "El nuevo contenido quedó registrado.");
      await load(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError("");
    try {
      const endpoint = deleteTarget.kind === "topic" ? "/api/content/testimonies"
        : deleteTarget.kind === "material" ? "/api/content/materials" : "/api/announcements";
      await fetch(endpoint, {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, confirmation: deleteConfirmation }),
      }).then(jsonResponse);
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setNotice(`Se eliminó “${deleteTarget.title}”.`);
      await load(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible borrar el contenido.");
    } finally {
      setBusy(false);
    }
  }

  async function hideInboxItem(item: InboxItem, method: "PATCH" | "DELETE") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fetch("/api/admin/inbox", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemKey: item.itemKey, sourceUpdatedAt: item.updatedAt }),
      }).then(jsonResponse);
      setNotice(method === "PATCH" ? "Solicitud archivada." : "Solicitud eliminada de la bandeja.");
      await load(false);
    } catch (inboxError) {
      setError(inboxError instanceof Error ? inboxError.message : "No fue posible actualizar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <><SubHeader label="Administración de contenidos" /><main className="content-admin"><div className="shell panel-loading full-page">Preparando las bibliotecas institucionales…</div></main><SubFooter /></>;
  if (!isAdmin) return <><SubHeader label="Administración de contenidos" /><main className="content-admin"><section className="section"><div className="shell"><div className="access-needed"><span>Acceso administrativo</span><h1>Esta sección está reservada para administración.</h1><p>Tu sesión sigue activa, pero tu perfil no tiene permiso para publicar o borrar contenido institucional.</p><Link className="button button-gold" href="/portal">Volver al portal</Link></div></div></section></main><SubFooter /></>;

  return <>
    <SubHeader label="Administración de contenidos" />
    <main className="content-admin">
      <section className="content-admin-hero"><div className="shell"><div><span className="eyebrow light">CENTRO DE CONTENIDOS</span><h1>Publicar con orden.<br /><em>Conservar con responsabilidad.</em></h1><p>Administra temas, archivos y comunicados sin tocar el código del portal.</p></div><aside><Link href="/directorio/gestion">← Volver a gestión</Link><Link href="/administracion/experiencias">Gestionar experiencias del mes →</Link><strong>{topics.length + materials.length + announcements.length}</strong><span>registros administrables</span></aside></div></section>
      <section className="content-admin-work"><div className="shell">
        {(error || notice) && <div className={`panel-alert ${error ? "error" : "ok"}`}><span>{error ? "!" : "✓"}</span><p>{error || notice}</p><button onClick={() => { setError(""); setNotice(""); }} aria-label="Cerrar aviso">×</button></div>}
        <div className="content-admin-tabs"><button className={tab === "topics" ? "active" : ""} onClick={() => { setTab("topics"); setSearch(""); }}>Testimonios <b>{topics.length}</b></button><button className={tab === "materials" ? "active" : ""} onClick={() => { setTab("materials"); setSearch(""); }}>Materiales <b>{materials.length}</b></button><button className={tab === "announcements" ? "active" : ""} onClick={() => { setTab("announcements"); setSearch(""); }}>Avisos y solicitudes <b>{announcements.length + inbox.summary.total}</b></button></div>
        <div className="content-admin-toolbar"><label><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en esta sección…" /></label><button className="button button-gold" onClick={() => openNew(tab === "topics" ? "topic" : tab === "materials" ? "material" : "announcement")}>+ {tab === "topics" ? "Subir tema" : tab === "materials" ? "Añadir material" : "Nuevo aviso"}</button></div>

        {tab === "topics" && <section className="content-library-panel"><div className="content-panel-heading"><div><span>BIBLIOTECA DE TESTIMONIOS</span><h2>Temas y archivos de apoyo</h2></div><p>Los {topics.length} temas actuales ya pueden editarse. Los nuevos se incorporan mediante un archivo y una ficha breve.</p></div><div className="content-record-list">{filteredTopics.map((item) => <article key={item.id}><div className="record-icon">T</div><div className="record-main"><div><span>{item.categoria || "General"}</span><small className={`content-status ${item.status}`}>{statusLabels[item.status] || item.status}</small></div><h3>{item.titulo}</h3><p>{item.objetivo || "Sin descripción todavía."}</p><small>{item.fileName || (item.origin === "catalog" ? "Ficha del catálogo institucional" : "Archivo pendiente")} · {friendlyDate(item.updatedAt)}</small></div><div className="record-actions"><button onClick={() => editTopic(item)}>Editar</button><button className="danger" onClick={() => { setDeleteTarget({ kind: "topic", id: item.id, title: item.titulo }); setDeleteConfirmation(""); }}>Borrar</button></div></article>)}</div></section>}

        {tab === "materials" && <section className="content-library-panel"><div className="content-panel-heading"><div><span>MATERIALES PARA LÍDERES</span><h2>Biblioteca operativa</h2></div><p>Sube protocolos, responsivas, formatos, reglamentos y materiales de experiencias.</p></div><div className="content-record-list">{filteredMaterials.map((item) => <article key={item.id}><div className="record-icon">M</div><div className="record-main"><div><span>{categoryLabels[item.category] || item.category}</span><small className={`content-status ${item.status}`}>{statusLabels[item.status] || item.status}</small></div><h3>{item.title}</h3><p>{item.description || "Sin descripción todavía."}</p><small>{item.fileName || "Archivo institucional"} · {friendlyDate(item.updatedAt)}</small></div><div className="record-actions"><button onClick={() => editMaterial(item)}>Editar</button><button className="danger" onClick={() => { setDeleteTarget({ kind: "material", id: item.id, title: item.title }); setDeleteConfirmation(""); }}>Borrar</button></div></article>)}</div></section>}

        {tab === "announcements" && <div className="notices-workspace"><section className="admin-inbox-panel"><div className="content-panel-heading"><div><span>BANDEJA OPERATIVA</span><h2>Solicitudes y contactos por resolver</h2></div><p>Reúne en una sola vista los pendientes del portal y el contacto que dejó cada persona.</p></div><div className="admin-inbox-summary"><article><span>PENDIENTES</span><strong>{inbox.summary.total}</strong><small>en todas las áreas</small></article><article className={inbox.summary.urgent ? "urgent" : ""}><span>PRIORIDAD ALTA</span><strong>{inbox.summary.urgent}</strong><small>requieren atención pronta</small></article>{Object.entries(inbox.summary.byArea).map(([area, count]) => <article key={area}><span>{area.toUpperCase()}</span><strong>{count}</strong><small>por resolver</small></article>)}</div><div className="admin-inbox-list">{filteredInbox.map((item) => <article className={item.priority === "urgent" ? "urgent" : ""} key={`${item.kind}-${item.id}`}><div className="inbox-area"><span>{item.area}</span><small>{requestStatusLabels[item.status] || item.status}</small></div><div className="inbox-main"><small>Folio {item.id} · {friendlyDate(item.createdAt)}</small><h3>{item.title}</h3><strong>{item.contactName}</strong><div>{item.phone && <a href={`tel:${item.phone}`}>Llamar: {item.phone}</a>}{item.phone && <a href={`https://wa.me/52${item.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{item.email && <a href={`mailto:${item.email}`}>{item.email}</a>}</div></div><div className="inbox-actions"><Link href={item.href}>Resolver</Link><button disabled={busy} onClick={() => void hideInboxItem(item, "PATCH")}>Archivar</button><button className="danger" disabled={busy} onClick={() => void hideInboxItem(item, "DELETE")}>Eliminar</button></div></article>)}{!filteredInbox.length && <div className="empty-panel"><span>✓</span><p>No hay solicitudes que coincidan con esta búsqueda.</p></div>}</div></section><section className="content-library-panel"><div className="content-panel-heading"><div><span>COMUNICACIÓN INTERNA</span><h2>Noticias y avisos publicados</h2></div><p>Al publicar, el aviso aparecerá en la campana de todos los perfiles indicados y quedará como no leído.</p></div><div className="content-record-list announcements-admin-list">{filteredAnnouncements.map((item) => <article key={item.id}><div className={`record-icon priority-${item.priority}`}>A</div><div className="record-main"><div><span>{audienceLabels[item.audience] || item.audience}</span><small className={`content-status ${item.status}`}>{statusLabels[item.status] || item.status}</small></div><h3>{item.title}</h3><p>{item.summary || item.body}</p><small>{item.publishedAt ? `Publicado ${friendlyDate(item.publishedAt)}` : "Todavía no se ha publicado"}</small></div><div className="record-actions"><button onClick={() => editAnnouncement(item)}>Editar</button><button className="danger" onClick={() => { setDeleteTarget({ kind: "announcement", id: item.id, title: item.title }); setDeleteConfirmation(""); }}>Borrar</button></div></article>)}</div></section></div>}
      </div></section>
    </main>

    {editorKind && <div className="editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorKind(null); }}><section className="editor-sheet content-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="content-editor-title"><header><div><span>{draft.id ? "EDITAR" : "NUEVO REGISTRO"}</span><h2 id="content-editor-title">{editorKind === "topic" ? "Tema de Testimonio" : editorKind === "material" ? "Material para líderes" : "Noticia o aviso"}</h2><p>{draft.id ? "Actualiza la ficha o sustituye el archivo." : "Completa la información esencial para publicarlo."}</p></div><button onClick={() => setEditorKind(null)} aria-label="Cerrar editor">×</button></header><form onSubmit={save}><div className="editor-body"><div className="editor-grid">
      {editorKind === "topic" && <><label className="wide required-field"><span>Título</span><input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} required /></label><label><span>Título corto</span><input value={draft.shortTitle} onChange={(e) => updateDraft("shortTitle", e.target.value)} /></label><label><span>Categoría</span><input value={draft.category} onChange={(e) => updateDraft("category", e.target.value)} required /></label><label><span>Intensidad</span><select value={draft.intensity} onChange={(e) => updateDraft("intensity", e.target.value)}><option>Baja</option><option>Media</option><option>Alta</option></select></label><label><span>Momento</span><select value={draft.moment} onChange={(e) => updateDraft("moment", e.target.value)}><option>Inicio</option><option>Mitad</option><option>Cierre</option></select></label><label className="wide"><span>Objetivo</span><textarea value={draft.objective} onChange={(e) => updateDraft("objective", e.target.value)} rows={3} /></label><label className="wide"><span>Frase ancla</span><input value={draft.anchor} onChange={(e) => updateDraft("anchor", e.target.value)} /></label><label className="wide"><span>Desarrollo</span><textarea value={draft.development} onChange={(e) => updateDraft("development", e.target.value)} rows={4} /></label><label className="wide"><span>Etiquetas separadas por comas</span><input value={draft.tags} onChange={(e) => updateDraft("tags", e.target.value)} /></label><label className="wide"><span>Pasos separados por comas</span><input value={draft.steps} onChange={(e) => updateDraft("steps", e.target.value)} /></label><label><span>Detectar · una pregunta por línea</span><textarea value={draft.detect} onChange={(e) => updateDraft("detect", e.target.value)} rows={5} /></label><label><span>Admitir · una pregunta por línea</span><textarea value={draft.admit} onChange={(e) => updateDraft("admit", e.target.value)} rows={5} /></label><label className="wide"><span>Corregir · una pregunta por línea</span><textarea value={draft.correct} onChange={(e) => updateDraft("correct", e.target.value)} rows={5} /></label><label className="wide"><span>Advertencia ética</span><textarea value={draft.ethicsNote} onChange={(e) => updateDraft("ethicsNote", e.target.value)} rows={3} /></label><label className="wide"><span>{draft.id ? "Sustituir archivo (opcional)" : "Archivo del tema"}</span><input type="file" required={!draft.id} accept=".pdf,.doc,.docx,.txt,.md,.rtf,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label></>}
      {editorKind === "material" && <><label className="wide required-field"><span>Nombre del material</span><input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} required /></label><label><span>Categoría</span><select value={draft.category} onChange={(e) => updateDraft("category", e.target.value)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Versión o referencia</span><input value={draft.versionLabel} onChange={(e) => updateDraft("versionLabel", e.target.value)} placeholder="Ej. Vigente 2026 · PDF" /></label><label className="wide"><span>Descripción</span><textarea value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} rows={4} /></label><label><span>Orden</span><input type="number" min="0" max="9999" value={draft.sortOrder} onChange={(e) => updateDraft("sortOrder", e.target.value)} /></label><label className="wide"><span>{draft.id ? "Sustituir archivo (opcional)" : "Archivo del material"}</span><input type="file" required={!draft.id} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.rtf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label></>}
      {editorKind === "announcement" && <><label className="wide required-field"><span>Título</span><input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} required /></label><label className="wide"><span>Resumen corto</span><input value={draft.summary} onChange={(e) => updateDraft("summary", e.target.value)} placeholder="Se mostrará en la campana de avisos" /></label><label className="wide"><span>Contenido completo</span><textarea value={draft.body} onChange={(e) => updateDraft("body", e.target.value)} rows={8} required /></label><label><span>Prioridad</span><select value={draft.priority} onChange={(e) => updateDraft("priority", e.target.value)}><option value="info">Informativo</option><option value="important">Importante</option><option value="urgent">Urgente</option></select></label><label><span>Destinatarios</span><select value={draft.audience} onChange={(e) => updateDraft("audience", e.target.value)}>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></>}
      <label className="wide"><span>Estado</span><select value={draft.status} onChange={(e) => updateDraft("status", e.target.value)}><option value="published">Publicar</option><option value="draft">Guardar como borrador</option>{editorKind !== "announcement" && <option value="archived">Archivar</option>}</select></label>
    </div></div><footer><button type="button" onClick={() => setEditorKind(null)}>Cancelar</button><button className="button button-gold" disabled={busy}>{busy ? "Guardando…" : draft.status === "published" ? "Guardar y publicar" : "Guardar borrador"}</button></footer></form></section></div>}

    {deleteTarget && <div className="editor-overlay delete-overlay" role="presentation"><section className="delete-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><span>ACCIÓN DEFINITIVA</span><h2 id="delete-title">¿Borrar “{deleteTarget.title}”?</h2><p>El registro dejará de aparecer en el portal. Si tiene un archivo subido, también se eliminará del almacenamiento.</p><label><span>Escribe el título exacto para confirmar</span><input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} autoFocus /></label><div><button onClick={() => setDeleteTarget(null)}>Cancelar</button><button className="danger-button" disabled={busy || deleteConfirmation !== deleteTarget.title} onClick={() => void confirmDelete()}>{busy ? "Borrando…" : "Borrar definitivamente"}</button></div></section></div>}
    <SubFooter />
  </>;
}
