"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";
import { UniversityContentManager, type ContentData } from "./university-content-manager";

type Row = Record<string, string | number>;
type View = "users" | "centers" | "certificates" | "content";
const userStatuses = { pending: "Pendiente de admisión", active: "Admitido", paused: "En pausa", completed: "Concluyó", archived: "Archivado" };
const centerStatuses = { received: "Recibida", in_review: "En revisión", approved: "Aprobada", changes_requested: "Requiere datos", closed: "Cerrada" };
const certificateStatuses = { pending_validation: "Por validar", in_review: "En revisión", approved: "Aprobado", ready: "Listo", delivered: "Entregado", closed: "Cerrado" };

async function json(response: Response) { const data = await response.json(); if (!response.ok) throw new Error(data.error || "No fue posible completar la operación."); return data; }

export function UniversityAdminDashboard() {
  const [view, setView] = useState<View>("users");
  const [users, setUsers] = useState<Row[]>([]);
  const [centers, setCenters] = useState<Row[]>([]);
  const [certificates, setCertificates] = useState<Row[]>([]);
  const [content, setContent] = useState<ContentData>({ programs: [], modules: [], materials: [], settings: {} });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const availableVersions = Array.from(new Set(["2022", "2025", "2026", ...content.programs.map((item) => String(item.generation || "")).filter(Boolean)]));

  async function load() {
    try { const data = await fetch("/api/admin/university", { cache: "no-store" }).then(json); setUsers(data.users || []); setCenters(data.centerBatches || []); setCertificates(data.certificateRequests || []); setContent(data.content || { programs: [], modules: [], materials: [], settings: {} }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar Universidad."); }
  }
  useEffect(() => { void load(); }, []);
  const filteredUsers = useMemo(() => { const term = search.toLowerCase(); return users.filter((item) => `${item.full_name} ${item.email} ${item.organization}`.toLowerCase().includes(term)); }, [users, search]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy("add"); setMessage("");
    try { await fetch("/api/admin/university", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }).then(json); setMessage("Usuario agregado correctamente a Universidad FGDLL."); form.reset(); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible agregar al usuario."); }
    finally { setBusy(""); }
  }

  async function update(kind: string, id: string | number, status: string, adminNotes = "") {
    setBusy(`${kind}-${id}`); setMessage("");
    try { await fetch("/api/admin/university", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, status, adminNotes }) }).then(json); setMessage("Estado actualizado."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible actualizar."); }
    finally { setBusy(""); }
  }

  return <><SubHeader label="Administración · Universidad" /><main className="university-admin-page"><section className="administration-hero"><div className="shell"><div><span className="eyebrow light">Universidad FGDLL</span><h1>Formación en un solo lugar.</h1><p>Administra usuarios, centros, reconocimientos y todos los contenidos de la plataforma educativa.</p></div><aside><span>USUARIOS ACTIVOS</span><strong>{users.filter((item) => item.status === "active").length}</strong><p>{users.length} registros totales</p></aside></div></section><section className="section"><div className="shell"><div className="uni-admin-tabs"><button className={view === "users" ? "active" : ""} onClick={() => setView("users")}>Usuarios · {users.length}</button><button className={view === "centers" ? "active" : ""} onClick={() => setView("centers")}>Centros · {centers.length}</button><button className={view === "certificates" ? "active" : ""} onClick={() => setView("certificates")}>Reconocimientos · {certificates.length}</button><button className={view === "content" ? "active" : ""} onClick={() => setView("content")}>Diplomados y materiales</button></div>{message && <div className="admin-message">{message}</div>}
      {view === "users" && <div className="uni-admin-layout"><aside><span className="eyebrow">Alta manual</span><h2>Agregar usuario</h2><p>El correo será su identificador único. Si ya existe, el sistema no creará un duplicado.</p><form className="report-form" onSubmit={addUser}><label>Nombre completo<input name="fullName" required /></label><label>Correo electrónico<input name="email" type="email" required /></label><label>Celular (opcional)<input name="mobilePhone" type="tel" /></label><label>Grupo o centro (opcional)<input name="organization" /></label><label>Generación<select name="diplomaVersion" defaultValue="2026">{availableVersions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tipo<select name="participantType" defaultValue="participant"><option value="participant">Participante</option><option value="center_director">Director de centro</option></select></label><button className="button button-gold" disabled={busy === "add"}>{busy === "add" ? "Agregando…" : "+ Agregar usuario"}</button></form></aside><section><div className="uni-admin-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo, grupo o centro…" /></div><div className="uni-record-list">{filteredUsers.map((item) => <article key={item.id}><header><div><h3>{item.full_name}</h3><a href={`mailto:${item.email}`}>{item.email}</a></div><span>{userStatuses[String(item.status) as keyof typeof userStatuses] || item.status}</span></header><p>{item.organization || "Sin grupo o centro"} · Generación {item.diploma_version} · {item.source === "admin_manual" ? "Alta manual" : "Registro web"}</p>{item.request_notes && <blockquote><b>Nota de la solicitud:</b> {item.request_notes}</blockquote>}<footer><select value={String(item.status)} disabled={busy === `user-${item.id}`} onChange={(event) => void update("user", item.id, event.target.value)}>{Object.entries(userStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{item.created_at}</small></footer></article>)}</div>{!filteredUsers.length && <div className="empty-panel">No hay usuarios en esta búsqueda.</div>}</section></div>}
      {view === "centers" && <div className="uni-record-list wide-list">{centers.map((item) => { const names = (() => { try { return JSON.parse(String(item.participant_names_json)) as string[]; } catch { return []; } })(); return <article key={item.id}><header><div><small>{item.id}</small><h3>{item.center_name}</h3><a href={`mailto:${item.director_email}`}>{item.director_email}</a></div><span>{centerStatuses[String(item.status) as keyof typeof centerStatuses] || item.status}</span></header><p>Generación {item.diploma_version} · {item.participant_count} participantes · {item.mobile_phone}</p>{item.request_notes && <blockquote><b>Nota de la solicitud:</b> {item.request_notes}</blockquote>}<details><summary>Ver participantes</summary><ol>{names.map((name) => <li key={name}>{name}</li>)}</ol></details><footer><select value={String(item.status)} disabled={busy === `center-${item.id}`} onChange={(event) => void update("center", item.id, event.target.value)}>{Object.entries(centerStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{item.created_at}</small></footer></article>; })}{!centers.length && <div className="empty-panel">Todavía no hay relaciones de centros.</div>}</div>}
      {view === "certificates" && <div className="uni-record-list wide-list">{certificates.map((item) => <article key={item.id}><header><div><small>{item.id}</small><h3>{item.full_name}</h3><a href={`tel:${item.mobile_phone}`}>{item.mobile_phone}</a></div><span>{certificateStatuses[String(item.status) as keyof typeof certificateStatuses] || item.status}</span></header><p>{item.group_name} · Generación {item.diploma_version} · Pago {item.payment_status} · {item.request_type === "reprinting" ? "Reimpresión" : "Primera impresión"}</p>{item.request_notes && <blockquote><b>Nota de la solicitud:</b> {item.request_notes}</blockquote>}<label>Nota administrativa<textarea id={`note-${item.id}`} defaultValue={String(item.admin_notes || "")} rows={2} /></label><footer><select value={String(item.status)} onChange={(event) => { const note = (document.getElementById(`note-${item.id}`) as HTMLTextAreaElement | null)?.value || ""; void update("certificate", item.id, event.target.value, note); }}>{Object.entries(certificateStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{item.created_at}</small></footer></article>)}{!certificates.length && <div className="empty-panel">Todavía no hay solicitudes de reconocimiento.</div>}</div>}
      {view === "content" && <UniversityContentManager content={content} reload={load} />}
    </div></section></main><SubFooter /></>;
}
