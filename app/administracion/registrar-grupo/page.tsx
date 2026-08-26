"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type Profile = { email: string; name: string; role: string; zone: string | null };
type RequestRecord = { id: string; requesterEmail: string; requesterName: string; requesterRole: string; zone: string; proposal: Record<string, string>; requesterNote: string; status: string; reviewNote: string; createdAt: string; updatedAt: string; createdGroupId: number | null };
const zones = ["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"];
const emptyDraft = { zone: "", name: "", city: "", leaderName: "", subleaderName: "", whatsapp: "", email: "", facebook: "", address: "", mapsUrl: "", schedules: "", sessionTypes: "", note: "" };
const statusLabels: Record<string, string> = { pending: "Pendiente", in_review: "En revisión", changes_requested: "Requiere corrección", approved: "Aprobado", rejected: "No aprobado" };

async function jsonResponse(response: Response) { const data = await response.json(); if (!response.ok) throw new Error(data.error || "No fue posible completar la operación."); return data; }
function friendlyDate(value: string) { const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`; const date = new Date(normalized); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }); }

export default function GroupRegistrationPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  async function load(showLoader = true) {
    if (showLoader) setLoading(true); setError("");
    try { const data = await fetch("/api/group-registrations", { cache: "no-store" }).then(jsonResponse); setProfile(data.profile || null); setRequests(data.requests || []); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No fue posible cargar las solicitudes."); }
    finally { setLoading(false); }
  }
  useEffect(() => { const task = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(task); }, []);

  const ownRequests = useMemo(() => requests.filter((item) => item.requesterEmail === profile?.email), [requests, profile]);
  const reviewable = useMemo(() => requests.filter((item) => item.requesterEmail !== profile?.email && ["pending", "in_review", "changes_requested"].includes(item.status)), [requests, profile]);
  const openOwn = ownRequests.find((item) => ["pending", "in_review", "changes_requested"].includes(item.status));
  const canReview = profile ? ["delegate", "council", "admin"].includes(profile.role) : false;

  function update(key: string, value: string) { setDraft((current) => ({ ...current, [key]: value })); }
  function editCorrection(item: RequestRecord) { setEditingId(item.id); setDraft({ ...emptyDraft, ...item.proposal, note: item.requesterNote || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelEdit() { setEditingId(null); setDraft({ ...emptyDraft }); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy("save"); setError(""); setNotice("");
    try {
      const { note, ...proposal } = draft;
      const response = await fetch("/api/group-registrations", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, action: "resubmit", proposal, note } : { proposal, note }) }).then(jsonResponse);
      setNotice(editingId ? `Las correcciones del folio ${response.id} fueron reenviadas.` : `La solicitud quedó registrada con el folio ${response.id}.`); cancelEdit(); await load(false);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No fue posible enviar el registro."); }
    finally { setBusy(""); }
  }

  async function review(id: string, action: string) {
    setBusy(`${id}-${action}`); setError(""); setNotice("");
    try { await fetch("/api/group-registrations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action, note: reviewNotes[id] || "" }) }).then(jsonResponse); setNotice(action === "approve" ? "El grupo fue dado de alta en el directorio." : action === "request_changes" ? "Se solicitaron correcciones." : "La solicitud quedó no aprobada."); await load(false); }
    catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "No fue posible resolver la solicitud."); }
    finally { setBusy(""); }
  }

  if (loading) return <><SubHeader label="Registro de grupos" /><main className="registration-page"><div className="shell panel-loading full-page">Preparando el formulario institucional…</div></main><SubFooter /></>;
  return <><SubHeader label="Registro de grupos" /><main className="registration-page">
    <section className="registration-hero"><div className="shell"><div><span className="eyebrow light">ALTA DE NUEVO GRUPO</span><h1>Registrar completo.<br /><em>Revisar antes de publicar.</em></h1><p>Este trámite se utiliza únicamente cuando el grupo todavía no existe en el Directorio Nacional.</p></div><aside><Link href="/administracion">← Volver a Administración</Link><strong>{openOwn ? statusLabels[openOwn.status] : "Disponible"}</strong><span>{openOwn ? `Folio ${openOwn.id}` : "Puedes iniciar un registro"}</span></aside></div></section>
    <section className="registration-work"><div className="shell registration-layout"><div className="registration-form-card"><header><span>{editingId ? "CORREGIR SOLICITUD" : "INFORMACIÓN DEL GRUPO"}</span><h2>{editingId ? `Folio ${editingId}` : "Nuevo registro institucional"}</h2><p>Completa los datos esenciales. Consejo, delegación o administración revisarán el expediente.</p></header>{(error || notice) && <div className={`form-message standalone ${error ? "error" : "ok"}`}>{error || notice}</div>}
      {openOwn && !editingId && openOwn.status !== "changes_requested" ? <div className="request-in-review"><span>◎</span><div><small>{openOwn.id}</small><h3>Tu solicitud está en revisión</h3><p>No es necesario enviar otra. Aquí podrás consultar cada resolución.</p><span className={`status-pill status-${openOwn.status}`}>{statusLabels[openOwn.status]}</span></div></div> : <form className="modern-form" onSubmit={submit}><fieldset><legend>1. Identidad institucional</legend><div className="form-grid"><label><span>Zona</span><select value={draft.zone} onChange={(e) => update("zone", e.target.value)} required><option value="">Selecciona una zona</option>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label><label><span>Nombre del grupo</span><input value={draft.name} onChange={(e) => update("name", e.target.value)} required /></label><label><span>Ciudad o municipio</span><input value={draft.city} onChange={(e) => update("city", e.target.value)} required /></label><label><span>Líder responsable</span><input value={draft.leaderName} onChange={(e) => update("leaderName", e.target.value)} required /></label><label><span>Sublíder / OSG</span><input value={draft.subleaderName} onChange={(e) => update("subleaderName", e.target.value)} /></label><label><span>Correo oficial</span><input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} /></label></div></fieldset><fieldset><legend>2. Contacto y ubicación</legend><div className="form-grid"><label><span>WhatsApp</span><input value={draft.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} inputMode="tel" required /></label><label><span>Facebook</span><input value={draft.facebook} onChange={(e) => update("facebook", e.target.value)} placeholder="https://facebook.com/…" /></label><label className="wide"><span>Dirección completa</span><textarea value={draft.address} onChange={(e) => update("address", e.target.value)} rows={3} required /></label><label className="wide"><span>Enlace de Google Maps</span><input value={draft.mapsUrl} onChange={(e) => update("mapsUrl", e.target.value)} placeholder="https://maps.google.com/…" /></label></div></fieldset><fieldset><legend>3. Operación del grupo</legend><label><span>Días y horarios</span><textarea value={draft.schedules} onChange={(e) => update("schedules", e.target.value)} rows={4} required placeholder="Ej. Lunes a viernes, 20:00 a 22:00 h" /></label><label><span>Tipos de sesiones</span><textarea value={draft.sessionTypes} onChange={(e) => update("sessionTypes", e.target.value)} rows={3} placeholder="Ej. principal, jóvenes o diversidad" /></label><label><span>Contexto para quien revisa</span><textarea value={draft.note} onChange={(e) => update("note", e.target.value)} rows={3} placeholder="Cuándo inició, quién validó o cualquier dato importante." /></label></fieldset><div className="form-submit-row">{editingId && <button type="button" className="button button-outline" onClick={cancelEdit}>Cancelar</button>}<button className="button button-gold form-submit" disabled={busy === "save"}>{busy === "save" ? "Enviando…" : editingId ? "Reenviar correcciones" : "Enviar a revisión"}</button></div></form>}
    </div><aside className="registration-history"><span>SEGUIMIENTO</span><h2>Mis registros</h2>{ownRequests.length ? ownRequests.map((item) => <article key={item.id}><div><strong>{item.id}</strong><span className={`status-pill status-${item.status}`}>{statusLabels[item.status]}</span></div><h3>{item.proposal.name}</h3><p>Zona {item.zone} · {friendlyDate(item.updatedAt || item.createdAt)}</p>{item.reviewNote && <blockquote>{item.reviewNote}</blockquote>}{item.status === "changes_requested" && <button className="button button-outline" onClick={() => editCorrection(item)}>Corregir y reenviar</button>}</article>) : <div className="empty-panel"><span>◎</span><p>Aquí aparecerá el historial de tus registros.</p></div>}</aside></div></section>
    {canReview && <section className="section registration-review" id="revision"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Revisión según facultades</span><h2>Solicitudes de nuevos grupos.</h2></div><p>Confirma que el grupo no exista, valida responsables, ubicación, contacto y horarios antes de aprobar.</p></div><div className="registration-review-list">{reviewable.map((item) => <article key={item.id}><header><div><span>{item.id}</span><h3>{item.proposal.name}</h3><p>{item.requesterName} · Zona {item.zone}</p></div><span className={`status-pill status-${item.status}`}>{statusLabels[item.status]}</span></header><dl><div><dt>Ciudad</dt><dd>{item.proposal.city}</dd></div><div><dt>Líder</dt><dd>{item.proposal.leaderName}</dd></div><div><dt>WhatsApp</dt><dd>{item.proposal.whatsapp}</dd></div><div><dt>Dirección</dt><dd>{item.proposal.address}</dd></div><div className="wide"><dt>Horarios</dt><dd>{item.proposal.schedules}</dd></div>{item.proposal.sessionTypes && <div className="wide"><dt>Tipos de sesiones</dt><dd>{item.proposal.sessionTypes}</dd></div>}</dl><label><span>Nota de revisión</span><textarea value={reviewNotes[item.id] || ""} onChange={(e) => setReviewNotes((current) => ({ ...current, [item.id]: e.target.value }))} rows={2} /></label><footer><button className="review-approve" disabled={Boolean(busy)} onClick={() => void review(item.id, "approve")}>Aprobar y dar de alta</button><button disabled={Boolean(busy)} onClick={() => void review(item.id, "request_changes")}>Solicitar corrección</button><button className="review-reject" disabled={Boolean(busy)} onClick={() => void review(item.id, "reject")}>No aprobar</button></footer></article>)}</div>{!reviewable.length && <div className="empty-panel"><span>✓</span><p>No hay registros nuevos pendientes dentro de tu alcance.</p></div>}</div></section>}
  </main><SubFooter /></>;
}
