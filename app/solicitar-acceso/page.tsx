"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../section-shell";

type Group = { id: number; zone: string; name: string; city: string };
type Identity = { displayName: string; email: string };
type Profile = { roleLabel: string } | null;
type RequestItem = { id: string; status: string; requestedRole: string; createdAt: string; reviewNote: string };

const roles = [
  { value: "leader", label: "Líder", text: "Responsable directo de un grupo." },
  { value: "osg", label: "OSG", text: "Servicio operativo dentro de un grupo." },
  { value: "delegate", label: "Delegado", text: "Coordinación de una zona completa." },
  { value: "council", label: "Consejo", text: "Revisión y aprobación institucional." },
];

const statusLabels: Record<string, string> = {
  pending: "Pendiente de revisión",
  in_review: "En revisión",
  approved: "Aprobada",
  rejected: "No aprobada",
  changes_requested: "Requiere información",
};

async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la solicitud.");
  return data;
}

export default function AccessRequestPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [role, setRole] = useState("leader");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string; folio?: string } | null>(null);

  const zones = useMemo(() => Array.from(new Set(groups.map((group) => group.zone))).sort(), [groups]);
  const visibleGroups = useMemo(() => zone ? groups.filter((group) => group.zone === zone) : groups, [groups, zone]);

  async function load() {
    setLoading(true);
    try {
      const [me, directory, history] = await Promise.all([
        fetch("/api/portal/me", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/directory", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/access-requests", { cache: "no-store" }).then(jsonResponse),
      ]);
      setIdentity(me.identity);
      setProfile(me.profile);
      setName(me.identity.displayName || "");
      setGroups(directory.groups || []);
      setRequests(history.requests || []);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "No fue posible cargar la página." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const result = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, requestedRole: role, zone, groupId: groupId || null, reason }),
      }).then(jsonResponse);
      setMessage({ kind: "ok", text: "Tu solicitud ya está en el panel de administración.", folio: result.id });
      const history = await fetch("/api/access-requests", { cache: "no-store" }).then(jsonResponse);
      setRequests(history.requests || []);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "No fue posible enviar la solicitud." });
    } finally {
      setSending(false);
    }
  }

  const needsGroup = role === "leader" || role === "osg";
  const needsZone = role === "delegate";

  return <>
    <SubHeader label="Solicitud de acceso" />
    <main className="access-page">
      <section className="access-hero"><div className="shell access-hero-grid"><div><span className="eyebrow light">Acceso institucional</span><h1>Solicita el perfil que corresponde a tu servicio.</h1><p>La solicitud llegará al panel del Consejo y la administración. El contacto institucional único para seguimiento es <a href="mailto:admin@fgdll.org">admin@fgdll.org</a>.</p></div><aside><span>PROCESO</span><ol><li><b>01</b> Identifica tu función.</li><li><b>02</b> Envía tus datos.</li><li><b>03</b> Administración revisa y activa.</li></ol></aside></div></section>
      <section className="section access-workspace"><div className="shell access-layout">
        <div className="access-form-card">
          <div className="panel-title"><span className="eyebrow">Nueva solicitud</span><h2>Datos de acceso</h2>{identity && <p>Cuenta conectada: <strong>{identity.email}</strong></p>}</div>
          {loading ? <div className="panel-loading">Preparando tu solicitud…</div> : profile ? <div className="panel-success"><span>✓</span><div><h3>Tu acceso ya está activo</h3><p>Tienes un perfil de <strong>{profile.roleLabel}</strong>. Puedes entrar directamente a la gestión del directorio.</p><Link className="button button-gold" href="/directorio/gestion">Abrir panel</Link></div></div> : <form className="modern-form" onSubmit={submit}>
            <fieldset><legend>1. ¿Cuál es tu función?</legend><div className="role-options">{roles.map((item) => <label key={item.value} className={role === item.value ? "selected" : ""}><input type="radio" name="role" value={item.value} checked={role === item.value} onChange={() => { setRole(item.value); setGroupId(""); setZone(""); }} /><span><b>{item.label}</b><small>{item.text}</small></span></label>)}</div></fieldset>
            <fieldset><legend>2. Identificación</legend><div className="form-grid"><label><span>Nombre completo</span><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} /></label><label><span>Teléfono / WhatsApp</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="999 000 0000" maxLength={30} /></label></div></fieldset>
            {(needsGroup || needsZone) && <fieldset><legend>3. Alcance del servicio</legend><div className="form-grid"><label><span>Zona</span><select value={zone} onChange={(event) => { setZone(event.target.value); setGroupId(""); }} required={needsZone}><option value="">Selecciona una zona</option>{zones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{needsGroup && <label><span>Grupo</span><select value={groupId} onChange={(event) => { const next = event.target.value; setGroupId(next); const selected = groups.find((group) => group.id === Number(next)); if (selected) setZone(selected.zone); }} required><option value="">Selecciona tu grupo</option>{visibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.city}</option>)}</select></label>}</div></fieldset>}
            <fieldset><legend>{needsGroup || needsZone ? "4" : "3"}. Información para validar</legend><label><span>Describe brevemente tu servicio</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Indica desde cuándo realizas esta función y cualquier dato que facilite la validación." maxLength={1200} /></label></fieldset>
            {message && <div className={`form-message ${message.kind}`}>{message.text}{message.folio && <><strong>Folio: {message.folio}</strong><a href={`mailto:admin@fgdll.org?subject=${encodeURIComponent(`Seguimiento ${message.folio}`)}`}>Escribir a administración</a></>}</div>}
            <button className="button button-gold form-submit" disabled={sending}>{sending ? "Enviando…" : "Enviar solicitud al panel"}</button>
            <p className="form-footnote">Tu correo de inicio de sesión identifica la solicitud. No compartas contraseñas ni datos sensibles.</p>
          </form>}
        </div>
        <aside className="request-history"><div className="panel-title"><span className="eyebrow">Seguimiento</span><h2>Mis solicitudes</h2></div>{requests.length ? <div className="history-list">{requests.map((item) => <article key={item.id}><div><strong>{item.id}</strong><span className={`status-pill status-${item.status}`}>{statusLabels[item.status] || item.status}</span></div><p>Perfil solicitado: {roles.find((roleItem) => roleItem.value === item.requestedRole)?.label || item.requestedRole}</p><small>{item.createdAt ? new Date(`${item.createdAt}Z`).toLocaleDateString("es-MX", { dateStyle: "medium" }) : ""}</small>{item.reviewNote && <blockquote>{item.reviewNote}</blockquote>}</article>)}</div> : <div className="empty-panel"><span>◎</span><p>Aquí podrás consultar el estado y el folio de cada solicitud.</p></div>}<div className="contact-card"><span>CONTACTO ÚNICO</span><a href="mailto:admin@fgdll.org">admin@fgdll.org</a><p>Úsalo para aclaraciones indicando siempre tu folio.</p></div></aside>
      </div></section>
    </main>
    <SubFooter />
  </>;
}
