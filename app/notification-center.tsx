"use client";

import { useEffect, useMemo, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  summary: string;
  body: string;
  priority: string;
  unread: boolean;
  publishedAt: string | null;
};

type AdminAlert = {
  itemKey: string;
  area: string;
  title: string;
  contactName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  href: string;
  priority: string;
  unread: boolean;
};

async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible cargar los avisos.");
  return data;
}

function friendlyDate(value: string | null) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function NotificationCenter() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const unread = useMemo(() => announcements.filter((item) => item.unread).length + adminAlerts.filter((item) => item.unread).length, [announcements, adminAlerts]);

  useEffect(() => {
    let active = true;
    fetch("/api/announcements", { cache: "no-store" })
      .then(jsonResponse)
      .then((data) => { if (active) setAnnouncements(data.announcements || []); })
      .catch(() => { if (active) setError("No se pudieron cargar los avisos."); });
    fetch("/api/admin/inbox", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : response.status === 401 || response.status === 403 ? { items: [] } : jsonResponse(response))
      .then((data) => { if (active) setAdminAlerts(data.items || []); })
      .catch(() => { if (active) setError("No se pudieron cargar todos los avisos."); });
    return () => { active = false; };
  }, []);

  async function markRead(id: string) {
    setAnnouncements((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item));
    try {
      await fetch("/api/announcements", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).then(jsonResponse);
    } catch {
      setAnnouncements((current) => current.map((item) => item.id === id ? { ...item, unread: true } : item));
    }
  }

  async function markAdminRead(itemKey: string, sourceUpdatedAt: string) {
    setAdminAlerts((current) => current.map((item) => item.itemKey === itemKey ? { ...item, unread: false } : item));
    try {
      await fetch("/api/admin/inbox", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemKey, sourceUpdatedAt }),
      }).then(jsonResponse);
    } catch {
      setAdminAlerts((current) => current.map((item) => item.itemKey === itemKey ? { ...item, unread: true } : item));
    }
  }

  return <div className="notification-center">
    <button className="notification-trigger" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span aria-hidden="true">●</span> Avisos {unread > 0 && <b>{unread}</b>}
    </button>
    {open && <div className="notification-popover">
      <header><div><small>AVISOS FGDLL</small><strong>Solicitudes, reportes y comunicados</strong></div><button type="button" aria-label="Cerrar avisos" onClick={() => setOpen(false)}>×</button></header>
      {error && <p className="notification-error">{error}</p>}
      <div className="notification-list">
        {adminAlerts.slice(0, 20).map((item) => <article key={item.itemKey} className={`admin-alert ${item.unread ? "unread" : ""} priority-${item.priority}`}>
          <div><span>{item.priority === "urgent" ? "ATENCIÓN URGENTE" : item.area.toUpperCase()}</span><small>{friendlyDate(item.createdAt)}</small></div>
          <h3>{item.title}</h3>
          <p>{item.contactName || "Solicitud recibida"} · Estado: {item.status}</p>
          <div className="notification-actions"><a href={item.href}>Abrir y atender</a>{item.unread && <button type="button" onClick={() => void markAdminRead(item.itemKey, item.updatedAt)}>Marcar como leído</button>}</div>
        </article>)}
        {announcements.slice(0, 8).map((item) => <article key={item.id} className={`${item.unread ? "unread" : ""} priority-${item.priority}`}>
          <div><span>{item.priority === "urgent" ? "URGENTE" : item.priority === "important" ? "IMPORTANTE" : "AVISO"}</span><small>{friendlyDate(item.publishedAt)}</small></div>
          <h3>{item.title}</h3>
          <p>{item.summary || item.body}</p>
          {(item.summary || item.body.length > 180) && <details><summary>Leer aviso completo</summary><p>{item.body}</p></details>}
          {item.unread && <button type="button" onClick={() => void markRead(item.id)}>Marcar como leído</button>}
        </article>)}
        {!adminAlerts.length && !announcements.length && !error && <div className="notification-empty"><span>✓</span><p>No hay avisos pendientes por el momento.</p></div>}
      </div>
    </div>}
  </div>;
}
