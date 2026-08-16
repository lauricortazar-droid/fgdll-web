"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type Experience = {
  id: string; month: string; zone: string; title: string; startDate: string; endDate: string;
  location: string; writings: string[]; notes: string; status: string; updatedAt: string;
};

const zones = ["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"];
const emptyDraft = { id: "", zone: "Jaguar", title: "", startDate: "", endDate: "", location: "", writings: "Amor\nPerdón\nLlegamos a Creer", notes: "", status: "published" };

async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ExperienceAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Experience | null>(null);
  const [confirmation, setConfirmation] = useState("");

  async function load(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const me = await fetch("/api/portal/me", { cache: "no-store" }).then(jsonResponse);
      const admin = me.profile?.role === "admin";
      setIsAdmin(admin);
      if (!admin) return;
      const data = await fetch("/api/monthly-experiences?admin=1", { cache: "no-store" }).then(jsonResponse);
      setItems(data.experiences || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar las experiencias.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const grouped = useMemo(() => {
    const result = new Map<string, Experience[]>();
    for (const item of items) result.set(item.month, [...(result.get(item.month) || []), item]);
    return Array.from(result.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  function edit(item: Experience) {
    setDraft({ ...item, writings: item.writings.join("\n") });
    setError(""); setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await fetch("/api/monthly-experiences", { method: draft.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) }).then(jsonResponse);
      setNotice(draft.id ? "La experiencia quedó actualizada." : "La experiencia quedó publicada.");
      setDraft(null);
      await load(false);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No fue posible guardar."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true); setError("");
    try {
      await fetch("/api/monthly-experiences", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id, confirmation }) }).then(jsonResponse);
      setNotice(`Se eliminó “${deleteTarget.title}”.`); setDeleteTarget(null); setConfirmation("");
      await load(false);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "No fue posible borrar."); }
    finally { setBusy(false); }
  }

  if (loading) return <><SubHeader label="Experiencias del mes" /><main className="content-admin"><div className="shell panel-loading full-page">Preparando el calendario de experiencias…</div></main><SubFooter /></>;
  if (!isAdmin) return <><SubHeader label="Experiencias del mes" /><main className="content-admin"><section className="section"><div className="shell"><div className="access-needed"><span>Acceso administrativo</span><h1>Esta sección está reservada para administración.</h1><Link className="button button-gold" href="/portal">Volver al portal</Link></div></div></section></main><SubFooter /></>;

  return <>
    <SubHeader label="Experiencias del mes" />
    <main className="content-admin experience-admin">
      <section className="content-admin-hero"><div className="shell"><div><span className="eyebrow light">PROGRAMACIÓN POR ZONAS</span><h1>Fechas claras.<br /><em>Escrituras visibles.</em></h1><p>Publica la experiencia de cada zona y especifica las salas de escritura disponibles.</p></div><aside><Link href="/administracion/contenidos">← Centro de contenidos</Link><strong>{items.length}</strong><span>experiencias registradas</span></aside></div></section>
      <section className="content-admin-work"><div className="shell">
        {(error || notice) && <div className={`panel-alert ${error ? "error" : "ok"}`}><span>{error ? "!" : "✓"}</span><p>{error || notice}</p><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
        <div className="experience-admin-toolbar"><div><span>PUBLICACIÓN INDEPENDIENTE</span><h2>Experiencias mensuales</h2><p>La agenda general continúa sincronizada con Google Calendar; esta sección se administra aquí.</p></div><button className="button button-gold" onClick={() => setDraft({ ...emptyDraft })}>+ Nueva experiencia</button></div>
        <div className="experience-admin-months">
          {grouped.map(([month, records]) => <section key={month}><header><h3>{monthLabel(month)}</h3><span>{records.length} {records.length === 1 ? "experiencia" : "experiencias"}</span></header><div>{records.map((item) => <article key={item.id}><span className={`experience-admin-zone zone-${zones.indexOf(item.zone) + 1}`}>{item.zone.charAt(0)}</span><div><small>Zona {item.zone} · {item.startDate} al {item.endDate}</small><h4>{item.title}</h4><p>{item.location || "Sede por confirmar"}</p><div>{item.writings.length ? item.writings.map((writing) => <b key={writing}>{writing}</b>) : <em>Escrituras por confirmar</em>}</div></div><aside><span className={`content-status ${item.status}`}>{item.status === "published" ? "Publicado" : item.status === "draft" ? "Borrador" : "Archivado"}</span><button onClick={() => edit(item)}>Editar</button><button className="danger" onClick={() => { setDeleteTarget(item); setConfirmation(""); }}>Borrar</button></aside></article>)}</div></section>)}
          {!grouped.length && <div className="empty-panel"><span>◎</span><strong>Aún no hay experiencias registradas.</strong><p>Agrega la primera para que aparezca en la página principal.</p></div>}
        </div>
      </div></section>
    </main>

    {draft && <div className="editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}><section className="editor-sheet content-editor-sheet" role="dialog" aria-modal="true"><header><div><span>{draft.id ? "EDITAR" : "NUEVA EXPERIENCIA"}</span><h2>{draft.id ? draft.title : "Programar experiencia"}</h2><p>Fecha, sede y escrituras visibles para toda la comunidad.</p></div><button onClick={() => setDraft(null)}>×</button></header><form onSubmit={save}><div className="editor-body"><div className="editor-grid">
      <label><span>Zona</span><select value={draft.zone} onChange={(e) => setDraft({ ...draft, zone: e.target.value })}>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
      <label><span>Estado</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="published">Publicar</option><option value="draft">Borrador</option><option value="archived">Archivar</option></select></label>
      <label className="wide required-field"><span>Nombre de la experiencia</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></label>
      <label><span>Fecha de inicio</span><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} required /></label>
      <label><span>Fecha de término</span><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} required /></label>
      <label className="wide"><span>Sede o ubicación</span><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Ej. La Amada Hacienda, Molas" /></label>
      <label className="wide"><span>Escrituras disponibles · una por línea</span><textarea value={draft.writings} onChange={(e) => setDraft({ ...draft, writings: e.target.value })} rows={5} placeholder={"Amor\nPerdón\nLlegamos a Creer"} /></label>
      <label className="wide"><span>Nota operativa</span><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} /></label>
    </div></div><footer><button type="button" onClick={() => setDraft(null)}>Cancelar</button><button className="button button-gold" disabled={busy}>{busy ? "Guardando…" : "Guardar experiencia"}</button></footer></form></section></div>}

    {deleteTarget && <div className="editor-overlay delete-overlay"><section className="delete-confirm-card" role="alertdialog" aria-modal="true"><span>ACCIÓN DEFINITIVA</span><h2>¿Borrar “{deleteTarget.title}”?</h2><p>Dejará de aparecer en la sección pública de experiencias.</p><label><span>Escribe el título exacto para confirmar</span><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoFocus /></label><div><button onClick={() => setDeleteTarget(null)}>Cancelar</button><button className="danger-button" disabled={busy || confirmation !== deleteTarget.title} onClick={() => void remove()}>{busy ? "Borrando…" : "Borrar definitivamente"}</button></div></section></div>}
    <SubFooter />
  </>;
}
