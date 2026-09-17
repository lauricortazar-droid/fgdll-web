"use client";

import { useEffect, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";
import { CenterAdminManager } from "./center-admin-manager";

type RequestItem = {
  id: string;
  request_type: string;
  current_center_name?: string;
  requester_email: string;
  requester_name: string;
  requester_phone: string;
  proposed_json: string;
  original_json: string;
  requester_note: string;
  status: string;
  review_note: string;
  created_at: string;
};

const fieldLabels: Record<string, string> = {
  name: "Nombre",
  network: "Red o familia",
  state: "Estado",
  city: "Ciudad",
  address: "Dirección",
  responsibleName: "Responsable autorizado",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  email: "Correo",
  website: "Sitio web",
  mapsUrl: "Mapa",
  description: "Descripción",
  services: "Servicios",
};

async function json(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

function parse(value: string) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

export function CenterReviewDashboard() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await fetch("/api/admin/centers", { cache: "no-store" }).then(json);
      setItems(result.requests || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function review(id: string, action: string) {
    setMessage("");
    try {
      await fetch("/api/admin/centers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action, note: notes[id] || "" }),
      }).then(json);
      setMessage(action === "approve" ? `Solicitud ${id} aprobada y publicada.` : `Solicitud ${id} actualizada.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible resolver la solicitud.");
    }
  }

  const pending = items.filter((item) => ["pending", "changes_requested"].includes(item.status));

  return <>
    <SubHeader label="Administración · Centros" />
    <main className="center-admin-page">
      <section className="administration-hero">
        <div className="shell">
          <div>
            <span className="eyebrow light">Aprobación obligatoria</span>
            <h1>Centros en revisión.</h1>
            <p>Compara cada solicitud antes de permitir que la información aparezca en el portal público.</p>
          </div>
          <aside><span>PENDIENTES</span><strong>{pending.length}</strong><p>Ningún cambio se publica sin tu aprobación.</p></aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading split-heading">
            <div><span className="eyebrow">Bandeja de centros</span><h2>Solicitudes y modificaciones</h2></div>
            <p>El folio conserva solicitante, fecha, propuesta y resolución administrativa.</p>
          </div>
          {message && <div className="form-message standalone ok">{message}</div>}
          {loading && <div className="panel-loading">Cargando solicitudes…</div>}
          <div className="center-review-list">
            {pending.map((item) => {
              const proposed = parse(item.proposed_json);
              const original = parse(item.original_json);
              return <article key={item.id} className="center-review-card">
                <header>
                  <div>
                    <small>{item.request_type === "registration" ? "NUEVO CENTRO" : "ACTUALIZACIÓN"}</small>
                    <h3>{proposed.name || item.current_center_name}</h3>
                    <span>Folio {item.id}</span>
                  </div>
                  <span className={`status-pill status-${item.status}`}>{item.status === "changes_requested" ? "Corrección solicitada" : "Pendiente"}</span>
                </header>
                <div className="review-requester">
                  <strong>{item.requester_name}</strong>
                  <span>{item.requester_email} · {item.requester_phone || "Sin teléfono"}</span>
                  {item.requester_note && <p>{item.requester_note}</p>}
                </div>
                <div className="center-comparison">
                  {Object.keys(fieldLabels).map((field) => proposed[field] !== undefined && proposed[field] !== original[field] ? <div key={field}>
                    <span>{fieldLabels[field]}</span>
                    {item.request_type === "update" && <del>{original[field] || "Sin dato"}</del>}
                    <strong>{proposed[field] || "Sin dato"}</strong>
                  </div> : null)}
                </div>
                <label>
                  <span>Nota de resolución</span>
                  <textarea rows={3} value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Motivo, corrección requerida o confirmación de revisión." />
                </label>
                <div className="review-actions">
                  <button className="button button-gold" onClick={() => void review(item.id, "approve")}>Aprobar y publicar</button>
                  <button className="button button-outline" onClick={() => void review(item.id, "request_changes")}>Solicitar correcciones</button>
                  <button className="button button-danger" onClick={() => void review(item.id, "reject")}>No aprobar</button>
                </div>
              </article>;
            })}
          </div>
          {!loading && !pending.length && <div className="empty-state"><strong>No hay solicitudes pendientes.</strong><span>Cuando un director registre o modifique un centro, aparecerá aquí.</span></div>}
        </div>
      </section>

      <CenterAdminManager />
    </main>
    <SubFooter />
  </>;
}
