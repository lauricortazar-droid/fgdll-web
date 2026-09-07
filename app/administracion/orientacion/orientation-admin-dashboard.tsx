"use client";

import { useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type RequestItem = {
  id: string;
  requester_name: string;
  whatsapp: string;
  city: string;
  relationship: string;
  age_group: string;
  help_type: string;
  danger: string;
  preferred_time: string;
  status: string;
  assigned_center_id: number | null;
  assigned_center_name?: string | null;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
};
type Center = { id: number; name: string; city: string };
const statusLabels: Record<string, string> = {
  new: "Nueva",
  contacted: "Contactada",
  oriented: "Orientada",
  referred: "Canalizada",
  closed: "Cerrada",
};
const helpLabels: Record<string, string> = {
  group: "Encontrar un grupo",
  family: "Orientación familiar",
  residential: "Valoración residencial",
  unsure: "Todavía no sabe",
};
const ageLabels: Record<string, string> = {
  minor: "Menor de edad",
  adult: "Mayor de edad",
  unknown: "No confirmado",
};
const dangerLabels: Record<string, string> = {
  yes: "Sí",
  no: "No",
  unsure: "No está seguro",
};
async function json(response: Response) {
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

export function OrientationAdminDashboard() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { status: string; center: string; notes: string }>
  >({});
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/orientation-requests", {
        cache: "no-store",
      }).then(json);
      setItems(data.requests || []);
      setCenters(data.centers || []);
      setDrafts(
        Object.fromEntries(
          (data.requests || []).map((item: RequestItem) => [
            item.id,
            {
              status: item.status,
              center: item.assigned_center_id
                ? String(item.assigned_center_id)
                : "",
              notes: item.admin_notes || "",
            },
          ]),
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cargar las solicitudes.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          filter === "all" ||
          (filter === "open"
            ? item.status !== "closed"
            : item.status === filter),
      ),
    [items, filter],
  );
  function updateDraft(
    id: string,
    key: "status" | "center" | "notes",
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  }
  async function save(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(id);
    setMessage("");
    try {
      await fetch("/api/orientation-requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          status: draft.status,
          assignedCenterId: draft.center,
          adminNotes: draft.notes,
        }),
      }).then(json);
      setMessage(`Solicitud ${id} actualizada.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la solicitud.",
      );
    } finally {
      setBusy("");
    }
  }
  const openCount = items.filter((item) => item.status !== "closed").length;
  return (
    <>
      <SubHeader label="Administración · Orientación" />
      <main className="orientation-admin-page">
        <section className="administration-hero">
          <div className="shell">
            <div>
              <span className="eyebrow light">SOLICITUDES PRIVADAS</span>
              <h1>
                Orientar con cuidado.
                <br />
                <em>Dar seguimiento con orden.</em>
              </h1>
              <p>
                Los datos personales y las notas de cada familia permanecen
                fuera del portal público.
              </p>
            </div>
            <aside>
              <span>ABIERTAS</span>
              <strong>{openCount}</strong>
              <p>
                {items.filter((item) => item.status === "new").length} nuevas
                por contactar
              </p>
            </aside>
          </div>
        </section>
        <section className="section">
          <div className="shell">
            <div className="orientation-admin-toolbar">
              <div>
                <span>FILTRAR SOLICITUDES</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="open">Todas las abiertas</option>
                  <option value="new">Nuevas</option>
                  <option value="contacted">Contactadas</option>
                  <option value="oriented">Orientadas</option>
                  <option value="referred">Canalizadas</option>
                  <option value="closed">Cerradas</option>
                  <option value="all">Historial completo</option>
                </select>
              </div>
              <a href="/administracion/centros">Administrar centros →</a>
            </div>
            {message && (
              <div className="form-message standalone ok">{message}</div>
            )}
            {loading && (
              <div className="panel-loading">
                Cargando solicitudes protegidas…
              </div>
            )}
            <div className="orientation-request-list">
              {visible.map((item) => {
                const draft = drafts[item.id];
                return (
                  <article
                    key={item.id}
                    className={`orientation-request-card danger-${item.danger}`}
                  >
                    <header>
                      <div>
                        <span>{item.id}</span>
                        <h2>{item.requester_name}</h2>
                        <p>
                          {item.city || "Ciudad no indicada"} ·{" "}
                          {item.relationship}
                        </p>
                      </div>
                      <div>
                        <small>
                          {new Date(
                            item.created_at.replace(" ", "T") + "Z",
                          ).toLocaleString("es-MX")}
                        </small>
                        <b className={`status-pill status-${item.status}`}>
                          {statusLabels[item.status] || item.status}
                        </b>
                      </div>
                    </header>
                    <div className="orientation-request-facts">
                      <div>
                        <span>WhatsApp</span>
                        <a
                          href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.whatsapp}
                        </a>
                      </div>
                      <div>
                        <span>Tipo de ayuda</span>
                        <strong>
                          {helpLabels[item.help_type] || item.help_type}
                        </strong>
                      </div>
                      <div>
                        <span>Edad</span>
                        <strong>
                          {ageLabels[item.age_group] || item.age_group}
                        </strong>
                      </div>
                      <div>
                        <span>Peligro inmediato</span>
                        <strong>
                          {dangerLabels[item.danger] || item.danger}
                        </strong>
                      </div>
                      <div>
                        <span>Horario preferido</span>
                        <strong>{item.preferred_time || "No indicado"}</strong>
                      </div>
                    </div>
                    {item.danger === "yes" && (
                      <div className="orientation-admin-alert">
                        La persona marcó peligro inmediato. El formulario le
                        indicó llamar al 911 o a Línea de la Vida sin esperar
                        respuesta.
                      </div>
                    )}
                    <div className="orientation-admin-editor">
                      <label>
                        <span>Estado</span>
                        <select
                          value={draft?.status || item.status}
                          onChange={(e) =>
                            updateDraft(item.id, "status", e.target.value)
                          }
                        >
                          <option value="new">Nueva</option>
                          <option value="contacted">Contactada</option>
                          <option value="oriented">Orientada</option>
                          <option value="referred">Canalizada</option>
                          <option value="closed">Cerrada</option>
                        </select>
                      </label>
                      <label>
                        <span>Centro de canalización</span>
                        <select
                          value={draft?.center || ""}
                          onChange={(e) =>
                            updateDraft(item.id, "center", e.target.value)
                          }
                        >
                          <option value="">Sin centro asignado</option>
                          {centers.map((center) => (
                            <option key={center.id} value={center.id}>
                              {center.name} · {center.city}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="wide">
                        <span>Notas privadas</span>
                        <textarea
                          rows={4}
                          value={draft?.notes || ""}
                          onChange={(e) =>
                            updateDraft(item.id, "notes", e.target.value)
                          }
                          placeholder="Seguimiento, acuerdos y próximos pasos. Nunca se muestra al público."
                        />
                      </label>
                      <button
                        className="button button-gold"
                        disabled={busy === item.id}
                        onClick={() => void save(item.id)}
                      >
                        {busy === item.id
                          ? "Guardando…"
                          : "Guardar seguimiento"}
                      </button>
                    </div>
                    <footer>
                      <span>Última actualización: {item.updated_at}</span>
                      <span>
                        Responsable: {item.updated_by || "Sin asignar"}
                      </span>
                    </footer>
                  </article>
                );
              })}
            </div>
            {!loading && !visible.length && (
              <div className="empty-state">
                <strong>No hay solicitudes en esta vista.</strong>
                <span>
                  Cuando una familia envíe el formulario, aparecerá aquí.
                </span>
              </div>
            )}
          </div>
        </section>
      </main>
      <SubFooter />
    </>
  );
}
