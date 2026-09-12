"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type CenterForm = { name: string; network: string; state: string; city: string; address: string; responsibleName: string; phone: string; whatsapp: string; email: string; website: string; mapsUrl: string; description: string; services: string };
type Center = CenterForm & { id: number; version: number };
type CenterRequest = { id: string; request_type: string; proposed_json: string; status: string; review_note: string; created_at: string; updated_at: string };
const empty: CenterForm = { name: "", network: "Red Teocalli", state: "", city: "", address: "", responsibleName: "", phone: "", whatsapp: "", email: "", website: "", mapsUrl: "", description: "", services: "" };
const labels: Record<keyof CenterForm, string> = { name: "Nombre del centro", network: "Red o familia", state: "Estado", city: "Ciudad o municipio", address: "Dirección pública", responsibleName: "Responsable autorizado", phone: "Teléfono", whatsapp: "WhatsApp", email: "Correo del centro", website: "Sitio web", mapsUrl: "Enlace de Google Maps", description: "Descripción pública", services: "Servicios y población atendida" };
const statusLabels: Record<string, string> = { pending: "Pendiente de aprobación", approved: "Aprobada", rejected: "No aprobada", changes_requested: "Requiere correcciones" };

async function json(response: Response) { const value = await response.json(); if (!response.ok) throw new Error(value.error || "No fue posible completar la solicitud."); return value; }
function parseProposal(request?: CenterRequest) { try { return request ? { ...empty, ...JSON.parse(request.proposed_json) } : empty; } catch { return empty; } }

export function CenterAccessWorkspace() {
  const [center, setCenter] = useState<Center | null>(null);
  const [requests, setRequests] = useState<CenterRequest[]>([]);
  const [identity, setIdentity] = useState<{ email: string; displayName: string } | null>(null);
  const [form, setForm] = useState<CenterForm>(empty);
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await fetch("/api/centers/workspace", { cache: "no-store" }).then(json);
      setCenter(result.center || null); setRequests(result.requests || []); setIdentity(result.identity || null);
      setRequesterName(result.identity?.displayName || "");
      if (result.center) setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, String(result.center[key] ?? "")])) as CenterForm);
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "No fue posible cargar tu espacio." }); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const open = requests.find((item) => ["pending", "changes_requested"].includes(item.status));

  function update(field: keyof CenterForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function correct(request: CenterRequest) { setEditing(request.id); setForm(parseProposal(request)); setMessage(null); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setMessage(null);
    try {
      let response: Response;
      if (editing) response = await fetch("/api/centers", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing, center: form, note }) });
      else if (center) response = await fetch("/api/centers/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ center: form, note }) });
      else response = await fetch("/api/centers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requesterName, requesterPhone, center: form, note }) });
      const result = await json(response);
      setMessage({ kind: "ok", text: `Solicitud ${result.id} enviada. La información pública no cambiará hasta que Administración la apruebe.` });
      setEditing(null); await load();
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "No fue posible enviar la solicitud." }); }
    finally { setSending(false); }
  }

  const canForm = !loading && (!open || editing === open.id);
  return <><SubHeader label="Centros · Acceso de directores" /><main className="center-access-page">
    <section className="center-access-hero"><div className="shell"><div><span className="eyebrow light">Espacio de centros</span><h1>{center ? "Mantén vigente la información de tu centro." : "Registra tu centro para revisión."}</h1><p>Tu cuenta identifica cada solicitud. Nada se publica automáticamente: Administración revisa y aprueba antes de mostrarlo en el directorio.</p></div><aside><span>CUENTA CONECTADA</span><strong>{identity?.email || "Cargando…"}</strong><ol><li>Captura los datos</li><li>Administración revisa</li><li>Se publica al aprobar</li></ol></aside></div></section>
    <section className="section"><div className="shell center-access-grid"><div className="center-form-card"><div className="panel-title"><span className="eyebrow">{center ? "Mi centro" : "Alta de centro"}</span><h2>{center?.name || "Información para el directorio"}</h2></div>
      {loading && <div className="panel-loading">Preparando tu espacio…</div>}
      {!loading && open && !editing && <div className={`form-message standalone ${open.status === "changes_requested" ? "error" : "ok"}`}><strong>{statusLabels[open.status]}</strong><span>Folio {open.id}</span>{open.review_note && <p>{open.review_note}</p>}{open.status === "changes_requested" && <button className="button button-gold" onClick={() => correct(open)}>Corregir y reenviar</button>}</div>}
      {canForm && <form className="modern-form center-form" onSubmit={submit}>{!center && !editing && <fieldset><legend>Responsable del registro</legend><div className="form-grid"><label><span>Nombre completo del director</span><input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} required /></label><label><span>Teléfono del director</span><input value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} required inputMode="tel" /></label></div></fieldset>}
        <fieldset><legend>Información pública del centro</legend><div className="form-grid">{(["name", "network", "state", "city", "address", "responsibleName", "phone", "whatsapp", "email", "website", "mapsUrl"] as (keyof CenterForm)[]).map((field) => <label key={field} className={field === "address" ? "form-wide" : ""}><span>{labels[field]}</span><input value={form[field]} onChange={(e) => update(field, e.target.value)} required={["name", "state", "city", "address"].includes(field)} type={field === "email" ? "email" : field.includes("Url") || field === "website" ? "url" : "text"} /></label>)}</div><label><span>{labels.description}</span><textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} /></label><label><span>{labels.services}</span><textarea rows={4} value={form.services} onChange={(e) => update("services", e.target.value)} /></label></fieldset>
        <fieldset><legend>Mensaje para Administración</legend><label><span>Observaciones o documentos disponibles</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explica el alta o los cambios que deseas realizar." /></label></fieldset>
        {message && <div className={`form-message ${message.kind}`}>{message.text}</div>}<button className="button button-gold form-submit" disabled={sending}>{sending ? "Enviando…" : editing ? "Reenviar correcciones" : center ? "Enviar cambios para aprobación" : "Enviar registro para aprobación"}</button><p className="form-footnote">No incluyas expedientes clínicos ni datos personales de usuarios.</p>
      </form>}{!canForm && message && <div className={`form-message standalone ${message.kind}`}>{message.text}</div>}
    </div><aside className="request-history"><div className="panel-title"><span className="eyebrow">Seguimiento</span><h2>Mis solicitudes</h2></div>{requests.length ? <div className="history-list">{requests.map((item) => <article className="history-file" key={item.id}><strong>{item.id}</strong><span className={`status-pill status-${item.status}`}>{statusLabels[item.status] || item.status}</span><p>{item.request_type === "registration" ? "Registro del centro" : "Actualización de información"}</p><small>{item.updated_at || item.created_at}</small>{item.review_note && <blockquote>{item.review_note}</blockquote>}</article>)}</div> : <div className="empty-panel"><span>◎</span><p>Aquí aparecerán el folio, el estado y la resolución de cada solicitud.</p></div>}<div className="contact-card"><span>ADMINISTRACIÓN</span><a href="mailto:admin@fgdll.org">admin@fgdll.org</a><p>Las solicitudes también se notifican a Administración General.</p></div><Link href="/centros">← Volver al directorio público</Link></aside></div></section>
  </main><SubFooter /></>;
}
