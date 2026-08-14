"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import calendarData from "./calendar-data.json";
import data from "./directory-data.json";

const zoneMeta: Record<string, { icon: string; line: string }> = {
  Jaguar: { icon: "J", line: "Fuerza y servicio" },
  "Tiburón": { icon: "T", line: "Determinación" },
  "Delfín": { icon: "D", line: "Renacimiento" },
  "Colibrí": { icon: "C", line: "Transformación" },
  "Águila": { icon: "A", line: "Visión elevada" },
};

type PublicGroup = {
  id: number;
  zone: string;
  name: string;
  city: string;
  leaderName: string;
  whatsapp: string;
  facebook: string;
  address: string;
};

const initialGroups: PublicGroup[] = data.grupos.map((group, index) => ({
  id: index + 1,
  zone: group.zona,
  name: group.nombre,
  city: group.ciudad,
  leaderName: group.lider,
  whatsapp: group.whatsapp,
  facebook: group.facebook ?? "",
  address: group.direccion,
}));

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string | null;
  url: string | null;
};

const agendaEvents = calendarData as CalendarEvent[];

function dateFromYmd(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function previousDay(value: string) {
  const date = dateFromYmd(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" }).format(dateFromYmd(value)).replace(".", "");
}

function eventDate(event: CalendarEvent) {
  const allDay = !/(Z|[+-]\d{2}:\d{2})$/.test(event.start);
  const start = event.start.slice(0, 10);
  const end = allDay ? previousDay(event.end) : event.end.slice(0, 10);
  const startDay = Number(start.slice(8, 10));
  const endDay = Number(end.slice(8, 10));
  if (start === end) return `${startDay} de ${shortMonth(start)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${startDay}–${endDay} de ${shortMonth(start)}`;
  return `${startDay} de ${shortMonth(start)} – ${endDay} de ${shortMonth(end)}`;
}

function eventTime(event: CalendarEvent) {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(event.start)) return "Todo el día";
  const startTime = event.start.slice(11, 16);
  const endTime = event.end.slice(11, 16);
  if (event.start.slice(0, 10) === event.end.slice(0, 10)) return `${startTime}–${endTime} h`;
  return `Inicia ${startTime} · termina ${endTime} h`;
}

function CalendarAgenda() {
  const months = useMemo(() => Array.from(new Set(agendaEvents.map((event) => event.start.slice(0, 7)))), []);
  const [activeMonth, setActiveMonth] = useState(months[0] ?? "");
  const events = agendaEvents.filter((event) => event.start.startsWith(activeMonth));

  return (
    <section className="section calendar-section" id="calendario">
      <div className="shell">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">Agenda oficial</span><h2>Calendario por meses.</h2></div>
          <p>Eventos vigentes y próximos tomados exclusivamente de Google Calendar <strong>AGENDA FGDLL</strong>.</p>
        </div>
        <div className="month-tabs" role="tablist" aria-label="Meses de la agenda">
          {months.map((month) => (
            <button key={month} type="button" role="tab" aria-selected={activeMonth === month} className={activeMonth === month ? "active" : ""} onClick={() => setActiveMonth(month)}>
              {monthLabel(month)}
            </button>
          ))}
        </div>
        <div className="month-panel" role="tabpanel">
          <div className="month-heading"><h3>{monthLabel(activeMonth)}</h3><span>{events.length} {events.length === 1 ? "evento" : "eventos"}</span></div>
          <div className="event-list">
            {events.map((event, index) => (
              <article className="event-row" key={event.id}>
                <span className="event-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="event-when"><time>{eventDate(event)}</time><span>{eventTime(event)}</span></div>
                <div className="event-main"><h3>{event.title}</h3>{event.location && <p className="event-location"><span aria-hidden="true">⌖</span>{event.location}</p>}</div>
                {event.url ? <a className="event-link" href={event.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${event.title} en Google Calendar`}>↗</a> : <span />}
              </article>
            ))}
          </div>
        </div>
        <p className="calendar-source">Fuente única: AGENDA FGDLL · Sincronizado el 14 de agosto de 2026.</p>
      </div>
    </section>
  );
}

function Logo() {
  return <span className="brand-shield" aria-hidden="true"><img src="/logo-gdll.png" alt="" /></span>;
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <div className="shell nav-shell">
        <Link className="brand" href="#inicio" onClick={() => setOpen(false)}>
          <Logo />
          <span><strong>FGDLL</strong><small>Portal de Líderes</small></span>
        </Link>
        <button className="menu-button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
        <nav className={open ? "main-nav open" : "main-nav"} aria-label="Navegación principal">
          <Link href="/portal" onClick={() => setOpen(false)}>Portal privado</Link>
          <Link href="/universidad" onClick={() => setOpen(false)}>Formación privada</Link>
          <Link href="/testimonios">Testimonios privados</Link>
          <a href="#calendario" onClick={() => setOpen(false)}>Agenda</a>
          <a href="#directorio" onClick={() => setOpen(false)}>Directorio</a>
          <Link href="/centros">Centros Teocalli</Link>
          <Link href="/etica">Ética</Link>
        </nav>
      </div>
    </header>
  );
}

function Directory({ groups }: { groups: PublicGroup[] }) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("Todas");
  const [limit, setLimit] = useState(9);
  const zones = ["Todas", ...Object.keys(zoneMeta)];
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return groups.filter((g) => {
      const inZone = zone === "Todas" || g.zone === zone;
      const haystack = `${g.name} ${g.city} ${g.leaderName} ${g.address} ${g.zone}`.toLocaleLowerCase("es");
      return inZone && (!term || haystack.includes(term));
    });
  }, [groups, query, zone]);

  function choose(next: string) {
    setZone(next);
    setLimit(9);
  }

  return (
    <section className="section directory-section" id="directorio">
      <div className="shell">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">Directorio oficial</span><h2>Encuentra un grupo cerca de ti.</h2></div>
          <p>Busca por nombre, ciudad, zona, dirección o persona responsable. Los datos de contacto se muestran tal como fueron registrados.</p>
        </div>
        <div className="directory-tools">
          <label className="search-field"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(9); }} placeholder="Buscar grupo, ciudad o responsable…" /></label>
          <div className="filter-row" role="group" aria-label="Filtrar por zona">
            {zones.map((item) => <button key={item} className={zone === item ? "active" : ""} onClick={() => choose(item)}>{item}</button>)}
          </div>
        </div>
        <div className="result-line"><strong>{filtered.length}</strong> grupos encontrados</div>
        <div className="directory-grid">
          {filtered.slice(0, limit).map((g) => (
            <article className="group-card" key={g.id}>
              <div className="group-top"><span className="zone-dot">{zoneMeta[g.zone]?.icon ?? g.zone.charAt(0)}</span><span>{g.zone}</span></div>
              <h3>{g.name}</h3>
              <p className="location">{g.city}</p>
              <dl><div><dt>Responsable</dt><dd>{g.leaderName}</dd></div>{g.address && <div><dt>Dirección</dt><dd>{g.address}</dd></div>}</dl>
              <div className="card-actions">
                {g.whatsapp && <a href={`https://wa.me/${g.whatsapp.replace(/\D/g, "").length === 10 ? "52" : ""}${g.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                {g.facebook && <a href={g.facebook} target="_blank" rel="noreferrer">Facebook</a>}
              </div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <div className="empty-state"><strong>No encontramos coincidencias.</strong><span>Prueba con otra ciudad, grupo o zona.</span></div>}
        {limit < filtered.length && <div className="center-action"><button className="button button-outline" onClick={() => setLimit(limit + 12)}>Mostrar más grupos</button></div>}
      </div>
    </section>
  );
}

function Footer() {
  return <footer className="footer"><div className="shell footer-grid"><div className="footer-brand"><Logo /><div><strong>Fraternidad Guerreros de la Luz</strong><span>Unidad · Servicio · Responsabilidad</span></div></div><div className="footer-links"><Link href="/portal">Portal</Link><Link href="/universidad">Universidad</Link><Link href="/testimonios">Testimonios</Link><Link href="/centros">Centros Teocalli</Link><Link href="/etica">Ética</Link></div><p>© 2026 FGDLL<br />Información institucional para orientar el servicio.</p></div></footer>;
}

export default function Home() {
  const [directoryGroups, setDirectoryGroups] = useState(initialGroups);
  useEffect(() => {
    let active = true;
    fetch("/api/directory")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => { if (active && Array.isArray(result.groups) && result.groups.length) setDirectoryGroups(result.groups); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const counts = directoryGroups.reduce<Record<string, number>>((acc, group) => { acc[group.zone] = (acc[group.zone] ?? 0) + 1; return acc; }, {});
  return (
    <>
      <Header />
      <main>
        <section className="hero" id="inicio">
          <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="shell hero-grid">
            <div className="hero-copy">
              <span className="eyebrow light">Portal institucional · FGDLL</span>
              <h1>Una red unida.<br /><em>Un servicio con rumbo.</em></h1>
              <p>Información, formación y herramientas para fortalecer el liderazgo de quienes sirven en la Fraternidad Guerreros de la Luz.</p>
              <div className="hero-actions"><Link className="button button-gold" href="/portal">🔒 Entrar al portal <span>→</span></Link><a className="button button-ghost" href="#directorio">Buscar mi grupo</a></div>
              <div className="trust-line"><span><b>{directoryGroups.length}</b> grupos registrados</span><span><b>5</b> zonas nacionales</span><span><b>28</b> centros Teocalli</span></div>
            </div>
            <div className="hero-console" aria-label="Resumen del portal">
              <div className="console-header"><span><i /><i /><i /></span><small>PORTAL FGDLL / 2026</small></div>
              <div className="console-welcome"><span>BUEN SERVICIO</span><h2>Todo lo importante,<br />en un mismo lugar.</h2></div>
              <div className="console-grid">
                <Link href="/portal"><small>01 · PRIVADO</small><strong>Operación</strong><span>Protocolos y formatos →</span></Link>
                <Link href="/universidad"><small>02 · PRIVADO</small><strong>Formación</strong><span>Diplomados y módulos →</span></Link>
                <Link href="/testimonios"><small>03 · PRIVADO</small><strong>Testimonios</strong><span>Temas y guías →</span></Link>
                <Link href="/etica"><small>04</small><strong>Integridad</strong><span>Orientación y reporte →</span></Link>
              </div>
              <div className="console-status"><span className="pulse" /> Información actualizada para el ciclo 2026</div>
            </div>
          </div>
        </section>

        <section className="manifesto"><div className="shell"><p>El liderazgo no es un privilegio. <strong>Es una responsabilidad de servicio.</strong></p><span>Este portal pone orden a la información para que la luz llegue más lejos.</span></div></section>

        <section className="section services-section">
          <div className="shell service-grid">
            <div className="service-intro"><span className="eyebrow light">Empieza aquí</span><h2>Elige lo que necesitas hacer.</h2><p>La información está ordenada por propósito para que encuentres el recurso correcto sin recorrer todo el sitio.</p><Link className="button button-gold" href="/portal">Abrir Portal de Líderes →</Link></div>
            <div className="service-cards">
              <Link href="/portal"><span>01 · 🔒</span><div><h3>Portal de Líderes</h3><p>Responsabilidades, protocolos, formatos y reglamentos.</p></div><b>↗</b></Link>
              <Link href="/universidad"><span>02 · 🔒</span><div><h3>Universidad FGDLL</h3><p>Diplomados, módulos, instrucciones y tareas.</p></div><b>↗</b></Link>
              <Link href="/testimonios"><span>03 · 🔒</span><div><h3>Biblioteca de Testimonios</h3><p>157 temas para detectar, admitir y corregir.</p></div><b>↗</b></Link>
              <a href="#directorio"><span>04</span><div><h3>Directorio Nacional</h3><p>Busca grupos por zona, ciudad o responsable.</p></div><b>↓</b></a>
              <Link href="/centros"><span>05</span><div><h3>Centros Teocalli</h3><p>Red de rehabilitación y acompañamiento.</p></div><b>↗</b></Link>
              <Link href="/etica"><span>06</span><div><h3>Ética e Integridad</h3><p>Orientación, cuidado y reporte responsable.</p></div><b>↗</b></Link>
            </div>
          </div>
        </section>

        <CalendarAgenda />

        <section className="section zones-section" id="red">
          <div className="shell">
            <div className="section-heading"><span className="eyebrow">Nuestra red nacional</span><h2>Cinco zonas. Una misma misión.</h2><p>Cada zona sostiene una parte del servicio y todas caminan bajo un propósito común.</p></div>
            <div className="zone-grid">
              {Object.entries(zoneMeta).map(([name, meta], i) => <button key={name} className={`zone-card zone-${i + 1}`} onClick={() => document.getElementById("directorio")?.scrollIntoView({ behavior: "smooth" })}><span className="zone-number">0{i + 1}</span><span className="zone-letter">{meta.icon}</span><h3>Zona {name}</h3><p>{meta.line}</p><strong>{counts[name] ?? 0} grupos <b>↗</b></strong></button>)}
              <Link className="zone-card zone-teocalli" href="/centros"><span className="zone-number">06</span><span className="zone-letter">T</span><h3>Centros Teocalli</h3><p>Rehabilitación y acompañamiento</p><strong>28 centros <b>↗</b></strong></Link>
            </div>
          </div>
        </section>

        <Directory groups={directoryGroups} />

        <section className="closing"><div className="shell"><span className="eyebrow light">Seguimos caminando</span><h2>La tecnología no sustituye<br />el corazón del servicio.</h2><p>Lo organiza para que cada líder pueda dedicar más tiempo a lo que verdaderamente importa: acompañar, formar y servir.</p><Link className="button button-gold" href="/portal">Abrir Portal de Líderes →</Link></div></section>
      </main>
      <Footer />
    </>
  );
}
