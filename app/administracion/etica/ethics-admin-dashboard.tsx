"use client";

import { useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type Report = Record<string, string> & { id: number };
type Event = Record<string, string> & { report_id: number };
const statusLabels: Record<string, string> = { received: "Recibido", screening: "Evaluación inicial", investigation: "Investigación", resolution: "Resolución", closed: "Cerrado" };
const severityLabels: Record<string, string> = { unclassified: "Sin clasificar", low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };

export function EthicsAdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ethics-reports", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible cargar los reportes.");
      setReports(data.reports || []); setEvents(data.events || []);
      setSelectedId((current) => current ?? data.reports?.[0]?.id ?? null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar los reportes."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => reports.filter((item) => filter === "all" || item.status === filter), [reports, filter]);
  const selected = reports.find((item) => item.id === selectedId) || null;
  const history = events.filter((item) => item.report_id === selectedId);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const formElement = event.currentTarget;
    setSaving(true); setMessage("");
    const body = { id: selected.id, ...Object.fromEntries(new FormData(formElement).entries()) };
    try {
      const response = await fetch("/api/admin/ethics-reports", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible guardar.");
      setMessage("Actualización registrada."); await load();
      formElement.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar."); }
    finally { setSaving(false); }
  }

  return <><SubHeader label="Administración · Ética" /><main className="ethics-admin"><section className="section"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Expedientes confidenciales</span><h1>Reportes de ética</h1></div><p>Clasifica, documenta y comunica avances. Las notas privadas nunca se muestran en el seguimiento de quien reportó.</p></div><div className="ethics-admin-toolbar"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="button" onClick={() => void load()}>Actualizar</button></div>{message && <p className="admin-message">{message}</p>}{loading ? <p>Cargando expedientes…</p> : <div className="ethics-admin-grid"><aside>{visible.length === 0 && <p>No hay reportes en este estado.</p>}{visible.map((item) => <button type="button" className={item.id === selectedId ? "active" : ""} onClick={() => setSelectedId(item.id)} key={item.id}><b>{String(item.public_folio).replace(/(.{4})/g, "$1 ").trim()}</b><span>{statusLabels[item.status] || item.status} · {severityLabels[item.severity] || item.severity}</span><small>{item.created_at}</small></button>)}</aside>{selected && <article className="ethics-case"><header><span>FOLIO</span><h2>{String(selected.public_folio).replace(/(.{4})/g, "$1 ").trim()}</h2><p>{selected.category} · {selected.group_zone || "Sin zona o grupo"} · {selected.approximate_date || "Sin fecha aproximada"}</p></header><dl><div><dt>Apoyo solicitado</dt><dd>{selected.support_needed}</dd></div><div><dt>Contacto</dt><dd>{selected.contact_method === "none" ? "No proporcionado" : `${selected.contact_method}: ${selected.safe_contact}`}</dd></div></dl><section><h3>Relato</h3><p>{selected.narrative}</p></section><section><h3>Personas o testigos</h3><p>{selected.people_or_witnesses || "No indicados"}</p></section><section><h3>Historial</h3>{history.map((item, index) => <div className="case-event" key={`${item.created_at}-${index}`}><b>{statusLabels[item.status] || item.status}</b>{item.public_message && <p>Público: {item.public_message}</p>}{item.private_note && <p>Privado: {item.private_note}</p>}<small>{item.created_at} · {item.actor_email}</small></div>)}</section><form onSubmit={save} className="report-form"><div className="report-form-row"><label>Estado<select name="status" defaultValue={selected.status}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Prioridad<select name="severity" defaultValue={selected.severity}>{Object.entries(severityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><label>Actualización pública<textarea name="publicMessage" rows={3} placeholder="Se mostrará al consultar el folio" /></label><label>Nota privada<textarea name="privateNote" rows={4} placeholder="Solo Administración" /></label><button className="button button-gold" disabled={saving}>{saving ? "Guardando…" : "Registrar actualización"}</button></form></article>}</div>}</div></section></main><SubFooter /></>;
}
