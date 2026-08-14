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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const unread = useMemo(() => announcements.filter((item) => item.unread).length, [announcements]);

  useEffect(() => {
    let active = true;
    fetch("/api/announcements", { cache: "no-store" })
      .then(jsonResponse)
      .then((data) => { if (active) setAnnouncements(data.announcements || []); })
      .catch(() => { if (active) setError("No se pudieron cargar los avisos."); });
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

  return <div className="notification-center">
    <button className="notification-trigger" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span aria-hidden="true">●</span> Avisos {unread > 0 && <b>{unread}</b>}
    </button>
    {open && <div className="notification-popover">
      <header><div><small>COMUNICADOS FGDLL</small><strong>Avisos para tu servicio</strong></div><button type="button" aria-label="Cerrar avisos" onClick={() => setOpen(false)}>×</button></header>
      {error && <p className="notification-error">{error}</p>}
      <div className="notification-list">
        {announcements.slice(0, 8).map((item) => <article key={item.id} className={`${item.unread ? "unread" : ""} priority-${item.priority}`}>
          <div><span>{item.priority === "urgent" ? "URGENTE" : item.priority === "important" ? "IMPORTANTE" : "AVISO"}</span><small>{friendlyDate(item.publishedAt)}</small></div>
          <h3>{item.title}</h3>
          <p>{item.summary || item.body}</p>
          {(item.summary || item.body.length > 180) && <details><summary>Leer aviso completo</summary><p>{item.body}</p></details>}
          {item.unread && <button type="button" onClick={() => void markRead(item.id)}>Marcar como leído</button>}
        </article>)}
        {!announcements.length && !error && <div className="notification-empty"><span>✓</span><p>No hay avisos publicados por el momento.</p></div>}
      </div>
    </div>}
  </div>;
}
