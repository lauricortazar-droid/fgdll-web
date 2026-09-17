"use client";

import { useEffect, useMemo, useState } from "react";

type Center = {
  id: number;
  name: string;
  network: string;
  state: string;
  city: string;
  address: string;
  responsibleName: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  mapsUrl: string;
  description: string;
  services: string;
  status: string;
  version: number;
  verifiedAt: string | null;
  updatedAt: string;
  updatedBy: string;
};

const emptyCenter: Center = {
  id: 0,
  name: "",
  network: "",
  state: "",
  city: "",
  address: "",
  responsibleName: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  mapsUrl: "",
  description: "",
  services: "",
  status: "published",
  version: 1,
  verifiedAt: null,
  updatedAt: "",
  updatedBy: "",
};

const fields: Array<{ key: keyof Center; label: string; multiline?: boolean }> = [
  { key: "name", label: "Nombre" },
  { key: "network", label: "Red o familia" },
  { key: "state", label: "Estado" },
  { key: "city", label: "Ciudad" },
  { key: "address", label: "Dirección" },
  { key: "responsibleName", label: "Responsable autorizado" },
  { key: "phone", label: "Teléfono" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Correo" },
  { key: "website", label: "Sitio web" },
  { key: "mapsUrl", label: "Enlace de mapa" },
  { key: "description", label: "Descripción", multiline: true },
  { key: "services", label: "Servicios", multiline: true },
];

async function json(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

export function CenterAdminManager() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [draft, setDraft] = useState<Center>(emptyCenter);
  const [query, setQuery] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(preferredId?: number) {
    setLoading(true);
    try {
      const result = await fetch("/api/admin/centers", { cache: "no-store" }).then(json);
      const next = (result.centers || []) as Center[];
      setCenters(next);
      const targetId = preferredId || selectedId || next[0]?.id || 0;
      const selected = next.find((center) => center.id === targetId) || next[0] || emptyCenter;
      setSelectedId(selected.id);
      setDraft(selected);
      setConfirmation("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar los centros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return centers;
    return centers.filter((center) => [center.name, center.city, center.state, center.network]
      .some((value) => value.toLowerCase().includes(term)));
  }, [centers, query]);

  function select(center: Center) {
    setSelectedId(center.id);
    setDraft(center);
    setConfirmation("");
    setMessage("");
  }

  function updateField(key: keyof Center, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!draft.id) return;
    setSaving(true);
    setMessage("");
    try {
      await fetch("/api/admin/centers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "center", id: draft.id, status: draft.status, center: draft }),
      }).then(json);
      setMessage(`Centro ${draft.name} actualizado directamente.`);
      await load(draft.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible actualizar el centro.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!draft.id) return;
    setSaving(true);
    setMessage("");
    try {
      await fetch("/api/admin/centers", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draft.id, confirmation }),
      }).then(json);
      setMessage(`Centro ${draft.name} retirado del portal público y archivado.`);
      await load(draft.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible archivar el centro.");
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    if (!draft.id) return;
    setSaving(true);
    setMessage("");
    try {
      await fetch("/api/admin/centers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "center", action: "restore", id: draft.id }),
      }).then(json);
      setMessage(`Centro ${draft.name} restaurado como oculto. Revísalo antes de volver a publicarlo.`);
      await load(draft.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible restaurar el centro.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="section" id="gestion-directa-centros">
    <div className="shell">
      <div className="section-heading split-heading">
        <div><span className="eyebrow">Gestión directa</span><h2>Editar y retirar centros</h2></div>
        <p>Los cambios hechos aquí no requieren una solicitud previa. Cada operación queda registrada para auditoría.</p>
      </div>
      {message && <div className="form-message standalone ok">{message}</div>}
      {loading ? <div className="panel-loading">Cargando centros…</div> : <div className="center-admin-direct-grid">
        <aside className="center-review-card">
          <label><span>Buscar centro</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, ciudad, estado o red" /></label>
          <div className="center-admin-list">
            {filtered.map((center) => <button type="button" key={center.id} className={center.id === selectedId ? "center-admin-list-item active" : "center-admin-list-item"} onClick={() => select(center)}>
              <strong>{center.name}</strong><span>{center.city}, {center.state}</span><small>{center.status} · v{center.version}</small>
            </button>)}
          </div>
          {!filtered.length && <div className="empty-state"><strong>Sin resultados.</strong><span>Cambia el texto de búsqueda.</span></div>}
        </aside>

        {draft.id ? <article className="center-review-card center-admin-editor">
          <header><div><small>CENTRO #{draft.id}</small><h3>{draft.name}</h3><span>Versión {draft.version}</span></div><span className={`status-pill status-${draft.status}`}>{draft.status}</span></header>
          <div className="form-grid">
            {fields.map(({ key, label, multiline }) => <label key={String(key)} className={multiline ? "span-2" : undefined}>
              <span>{label}</span>
              {multiline
                ? <textarea rows={4} value={String(draft[key] ?? "")} onChange={(event) => updateField(key, event.target.value)} />
                : <input value={String(draft[key] ?? "")} onChange={(event) => updateField(key, event.target.value)} />}
            </label>)}
            <label><span>Visibilidad</span><select value={draft.status} onChange={(event) => updateField("status", event.target.value)}><option value="published">Publicado</option><option value="hidden">Oculto</option><option value="archived">Archivado</option></select></label>
          </div>
          <div className="review-actions"><button type="button" className="button button-gold" disabled={saving || draft.status === "archived"} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar cambios"}</button>{draft.status === "archived" && <button type="button" className="button button-outline" disabled={saving} onClick={() => void restore()}>Restaurar como oculto</button>}</div>
          {draft.status !== "archived" && <div className="center-admin-danger-zone"><label><span>Para retirar este centro, escribe exactamente: <strong>{draft.name}</strong></span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={draft.name} /></label><button type="button" className="button button-danger" disabled={saving || confirmation !== draft.name} onClick={() => void archive()}>Retirar y archivar</button></div>}
        </article> : <div className="empty-state"><strong>No hay centros registrados.</strong></div>}
      </div>}
    </div>
  </section>;
}
