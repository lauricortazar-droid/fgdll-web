"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";
import { UniversityContentManager, type ContentData } from "./university-content-manager";

type Row = Record<string, string | number>;
type View = "users" | "centers" | "certificates" | "content";
const userStatuses = { pending: "Pendiente de admisión", active: "Admitido", paused: "En pausa", completed: "Concluyó", archived: "Archivado" };
const centerStatuses = { received: "Recibida", in_review: "En revisión", approved: "Aprobada", changes_requested: "Requiere datos", closed: "Cerrada" };
const certificateStatuses = { pending_validation: "Por validar", in_review: "En revisión", approved: "Aprobado", ready: "Listo", delivered: "Entregado", closed: "Cerrado" };
const taskStatuses = { complete: "Completas", partial: "Parciales", pending: "Pendientes" };
const paymentStatuses = { total: "Total", partial: "Parcial", pending: "Pendiente" };

function downloadCsv(filename: string, rows: Row[], columns: Array<[string, string]>) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const content = [columns.map(([, label]) => escape(label)).join(","), ...rows.map((row) => columns.map(([key]) => escape(row[key])).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function whatsappLink(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}`;
}

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
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar Formación."); }
  }
  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, []);
  const filteredUsers = useMemo(() => { const term = search.toLowerCase(); return users.filter((item) => `${item.full_name} ${item.email} ${item.organization}`.toLowerCase().includes(term)); }, [users, search]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy("add"); setMessage("");
    try { await fetch("/api/admin/university", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }).then(json); setMessage("Usuario agregado correctamente a Formación FGDLL."); form.reset(); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible agregar al usuario."); }
    finally { setBusy(""); }
  }

  async function update(kind: string, id: string | number, status: string, adminNotes = "", designCompleted = false, sentToContact = false) {
    setBusy(`${kind}-${id}`); setMessage("");
    try { await fetch("/api/admin/university", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, status, adminNotes, designCompleted, sentToContact }) }).then(json); setMessage("Seguimiento actualizado."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible actualizar."); }
    finally { setBusy(""); }
  }

  return <>
    <SubHeader label="Administración · Formación" />
    <main className="university-admin-page">
      <section className="administration-hero"><div className="shell"><div><span className="eyebrow light">Formación FGDLL</span><h1>Formación en un solo lugar.</h1><p>Administra usuarios, centros, reconocimientos y todos los contenidos de la plataforma educativa.</p></div><aside><span>USUARIOS ACTIVOS</span><strong>{users.filter((item) => item.status === "active").length}</strong><p>{users.length} registros totales</p></aside></div></section>
      <section className="section"><div className="shell">
        <div className="uni-admin-navigation"><div className="uni-admin-tabs"><button className={view === "users" ? "active" : ""} onClick={() => setView("users")}>Solicitudes de Formación · {users.length}</button><button className={view === "centers" ? "active" : ""} onClick={() => setView("centers")}>Registros de centros · {centers.length}</button><button className={view === "certificates" ? "active" : ""} onClick={() => setView("certificates")}>Solicitudes de reconocimiento · {certificates.length}</button><button className={view === "content" ? "active" : ""} onClick={() => setView("content")}>Diplomados y materiales</button></div><Link className="button button-gold" href="/administracion/universidad/reconocimientos">Emitir reconocimientos</Link></div>
        {message && <div className="admin-message">{message}</div>}

        {view === "users" && <div className="uni-admin-layout">
          <aside><span className="eyebrow">Alta manual</span><h2>Agregar usuario</h2><p>El correo será su identificador único. Si ya existe, el sistema no creará un duplicado.</p><form className="report-form" onSubmit={addUser}><label>Nombre completo<input name="fullName" required /></label><label>Correo electrónico<input name="email" type="email" required /></label><label>Celular (opcional)<input name="mobilePhone" type="tel" /></label><label>Grupo o centro (opcional)<input name="organization" /></label><label>Generación<select name="diplomaVersion" defaultValue="2026">{availableVersions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tipo<select name="participantType" defaultValue="participant"><option value="participant">Participante</option><option value="center_director">Director de centro</option></select></label><button className="button button-gold" disabled={busy === "add"}>{busy === "add" ? "Agregando…" : "+ Agregar usuario"}</button></form></aside>
          <section><div className="uni-admin-toolbar"><div className="uni-admin-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo, grupo o centro…" /></div><button className="button button-outline" onClick={() => downloadCsv("universidad-participantes.csv", filteredUsers, [["full_name", "Nombre"], ["email", "Correo"], ["mobile_phone", "Celular"], ["organization", "Grupo o centro"], ["participant_type", "Tipo"], ["diploma_version", "Generación"], ["status", "Estado"], ["design_completed", "Diseño realizado"], ["sent_to_contact", "Enviado"], ["created_at", "Fecha"]])}>Descargar para Excel / Sheets</button></div>
            <div className="uni-record-list">{filteredUsers.map((item) => <article key={item.id}><header><div><h3>{item.full_name}</h3><div className="contact-links"><a href={`mailto:${item.email}`}>{item.email}</a>{item.mobile_phone && <a href={whatsappLink(item.mobile_phone)} target="_blank" rel="noreferrer">WhatsApp · {item.mobile_phone}</a>}</div></div><span>{userStatuses[String(item.status) as keyof typeof userStatuses] || item.status}</span></header><p>{item.organization || "Sin grupo o centro"} · Generación {item.diploma_version} · {item.participant_type === "center_director" ? "Director de centro" : "Participante"}</p>{item.request_notes && <blockquote><b>Nota de la solicitud:</b> {item.request_notes}</blockquote>}<div className="delivery-checks"><label><input type="checkbox" checked={Boolean(item.design_completed)} onChange={(event) => void update("user", item.id, String(item.status), "", event.target.checked, Boolean(item.sent_to_contact))} /> Diseño realizado</label><label><input type="checkbox" checked={Boolean(item.sent_to_contact)} onChange={(event) => void update("user", item.id, String(item.status), "", Boolean(item.design_completed), event.target.checked)} /> Enviado a su contacto</label></div><footer><select value={String(item.status)} disabled={busy === `user-${item.id}`} onChange={(event) => void update("user", item.id, event.target.value, "", Boolean(item.design_completed), Boolean(item.sent_to_contact))}>{Object.entries(userStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{item.created_at}</small></footer></article>)}</div>{!filteredUsers.length && <div className="empty-panel">No hay usuarios en esta búsqueda.</div>}
          </section>
        </div>}

        {view === "centers" && <><div className="uni-export-row"><button className="button button-outline" onClick={() => downloadCsv("universidad-centros.csv", centers, [["id", "Folio"], ["center_name", "Centro"], ["director_email", "Correo del director"], ["mobile_phone", "Celular"], ["diploma_version", "Generación"], ["participant_count", "Participantes"], ["status", "Estado"], ["design_completed", "Diseño realizado"], ["sent_to_contact", "Enviado"], ["created_at", "Fecha"]])}>Descargar para Excel / Sheets</button></div><div className="uni-record-list wide-list">{centers.map((item) => { const names = (() => { try { return JSON.parse(String(item.participant_names_json)) as string[]; } catch { return []; } })(); return <article key={item.id}><header><div><small>{item.id}</small><h3>{item.center_name}</h3><div className="contact-links"><a href={`mailto:${item.director_email}`}>{item.director_email}</a><a href={whatsappLink(item.mobile_phone)} target="_blank" rel="noreferrer">WhatsApp · {item.mobile_phone}</a></div></div><span>{centerStatuses[String(item.status) as keyof typeof centerStatuses] || item.status}</span></header><p>Generación {item.diploma_version} · {item.participant_count} participantes</p>{item.request_notes && <blockquote><b>Nota de la solicitud:</b> {item.request_notes}</blockquote>}<details><summary>Ver participantes</summary><ol>{names.map((name) => <li key={name}>{name}</li>)}</ol></details><div className="delivery-checks"><label><input type="checkbox" checked={Boolean(item.design_completed)} onChange={(event) => void update("center", item.id, String(item.status), "", event.target.checked, Boolean(item.sent_to_contact))} /> Diseño realizado</label><label><input type="checkbox" checked={Boolean(item.sent_to_contact)} onChange={(event) => void update("center", item.id, String(item.status), "", Boolean(item.design_completed), event.target.checked)} /> Enviado a su contacto</label></div><footer><select value={String(item.status)} disabled={busy === `center-${item.id}`} onChange={(event) => void update("center", item.id, event.target.value, "", Boolean(item.design_completed), Boolean(item.sent_to_contact))}>{Object.entries(centerStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{item.created_at}</small></footer></article>; })}{!centers.length && <div className="empty-panel">Todavía no hay relaciones de centros.</div>}</div></>}

        {view === "certificates" && <><div className="uni-export-row"><button className="button button-outline" onClick={() => downloadCsv("universidad-reconocimientos.csv", certificates, [["id", "Folio"], ["full_name", "Nombre"], ["email", "Correo"], ["mobile_phone", "Celular"], ["group_name", "Grupo o centro"], ["diploma_version", "Generación"], ["payment_status", "Pago"], ["tasks_status", "Tareas"], ["request_type", "Solicitud"], ["status", "Estado"], ["design_completed", "Diseño realizado"], ["sent_to_contact", "Enviado"], ["created_at", "Fecha"]])}>Descargar para Excel / Sheets</button></div><div className="uni-record-list wide-list">{certificates.map((item) => <article key={item.id}><header><div><small>{item.id}</small><h3>{item.full_name}</h3><div className="contact-links">{item.email && <a href={`mailto:${item.email}`}>{item.email}</a>}<a href={whatsappLink(item.mobile_phone)} target="_blank" rel="noreferrer">WhatsApp · {item.mobile_phone}</a></div></div><span>{certificateStatuses[String(item.status) as keyof typeof certificateStatuses] || item.status}</span></header><p>{item.group_name} · Generación {item.diploma_version}</p><div className="certificate-facts"><span>Pago: <b>{paymentStatuses[String(item.payment_status) as keyof typeof paymentStatuses] || item.payment_status}</b></span><span>Tareas: <b>{taskStatuses[String(item.tasks_status) as keyof typeof taskStatuses] || item.tasks_status}</b></span><span>{item.request_type === "reprinting" ? "Reimpresión" : "Primera impresión"}</span></div>{item.request_notes && <blockquote><b>Nota de la solicitud:</b> {item.request_notes}</blockquote>}<label>Nota administrativa<textarea id={`note-${item.id}`} defaultValue={String(item.admin_notes || "")} rows={2} /></label><div className="delivery-checks"><label><input type="checkbox" checked={Boolean(item.design_completed)} onChange={(event) => { const note = (document.getElementById(`note-${item.id}`) as HTMLTextAreaElement | null)?.value || ""; void update("certificate", item.id, String(item.status), note, event.target.checked, Boolean(item.sent_to_contact)); }} /> Diseño realizado</label><label><input type="checkbox" checked={Boolean(item.sent_to_contact)} onChange={(event) => { const note = (document.getElementById(`note-${item.id}`) as HTMLTextAreaElement | null)?.value || ""; void update("certificate", item.id, String(item.status), note, Boolean(item.design_completed), event.target.checked); }} /> Enviado a su contacto</label></div><footer><select value={String(item.status)} onChange={(event) => { const note = (document.getElementById(`note-${item.id}`) as HTMLTextAreaElement | null)?.value || ""; void update("certificate", item.id, event.target.value, note, Boolean(item.design_completed), Boolean(item.sent_to_contact)); }}>{Object.entries(certificateStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{item.created_at}</small></footer></article>)}{!certificates.length && <div className="empty-panel">Todavía no hay solicitudes de reconocimiento.</div>}</div></>}
        {view === "content" && <UniversityContentManager content={content} reload={load} />}
      </div></section>
    </main>
    <SubFooter />
  </>;
}
