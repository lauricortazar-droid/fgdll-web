"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import calendarData from "./calendar-data.json";
import data from "./directory-data.json";
import monthlyExperienceData from "./monthly-experiences-data.json";

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

type MonthlyExperience = {
  id: string;
  month: string;
  zone: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  writings: string[];
  notes: string;
  status: string;
};

const initialMonthlyExperiences = monthlyExperienceData as MonthlyExperience[];
const zoneNames = Object.keys(zoneMeta);

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

function experienceDate(item: MonthlyExperience) {
  const startDay = Number(item.startDate.slice(8, 10));
  const endDay = Number(item.endDate.slice(8, 10));
  if (item.startDate === item.endDate) return `${startDay} de ${shortMonth(item.startDate)}`;
  if (item.startDate.slice(0, 7) === item.endDate.slice(0, 7)) return `${startDay}–${endDay} de ${shortMonth(item.startDate)}`;
  return `${startDay} de ${shortMonth(item.startDate)} – ${endDay} de ${shortMonth(item.endDate)}`;
}

function MonthlyExperiences() {
  const [items, setItems] = useState(initialMonthlyExperiences);
  const months = useMemo(() => Array.from(new Set(items.map((item) => item.month))).sort(), [items]);
  const [activeMonth, setActiveMonth] = useState(months[0] ?? new Date().toISOString().slice(0, 7));

  useEffect(() => {
    let active = true;
    fetch("/api/monthly-experiences", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => {
        if (!active || !Array.isArray(result.experiences) || !result.experiences.length) return;
        setItems(result.experiences);
        const nextMonths = Array.from(new Set((result.experiences as MonthlyExperience[]).map((item) => item.month))).sort();
        setActiveMonth((current) => nextMonths.includes(current) ? current : nextMonths[0]);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const monthItems = items.filter((item) => item.month === activeMonth);
  return (
    <section className="section monthly-experiences" id="experiencias-del-mes">
      <div className="shell">
        <div className="section-heading split-heading monthly-experience-heading">
          <div><span className="eyebrow light">Experiencias del mes</span><h2>Cada zona, su fecha y sus escrituras.</h2></div>
          <p>Consulta la experiencia programada para cada zona y las salas de escritura disponibles. Los cambios publicados por administración aparecen aquí automáticamente.</p>
        </div>
        <div className="experience-month-tabs" role="tablist" aria-label="Meses de experiencias">
          {months.map((month) => <button key={month} type="button" role="tab" aria-selected={activeMonth === month} className={activeMonth === month ? "active" : ""} onClick={() => setActiveMonth(month)}>{monthLabel(month)}</button>)}
        </div>
        <div className="experience-zone-grid" role="tabpanel">
          {zoneNames.map((zone, zoneIndex) => {
            const zoneItems = monthItems.filter((item) => item.zone === zone);
            return <article className={`experience-zone-card experience-zone-${zoneIndex + 1}`} key={zone}>
              <header><span>{zoneMeta[zone].icon}</span><div><small>ZONA</small><h3>{zone}</h3></div></header>
              {zoneItems.length ? zoneItems.map((item) => <div className="experience-entry" key={item.id}>
                <div className="experience-date"><span>FECHA</span><strong>{experienceDate(item)}</strong></div>
                <h4>{item.title}</h4>
                {item.location && <p className="experience-location"><span aria-hidden="true">⌖</span>{item.location}</p>}
                <div className="writing-block"><span>ESCRITURAS DISPONIBLES</span><div>{item.writings.length ? item.writings.map((writing) => <b key={writing}>{writing}</b>) : <em>Por confirmar</em>}</div></div>
                {item.notes && <p className="experience-note">{item.notes}</p>}
              </div>) : <div className="experience-empty"><span>—</span><strong>Sin experiencia publicada</strong><p>Administración actualizará aquí la fecha y las escrituras cuando queden confirmadas.</p></div>}
            </article>;
          })}
        </div>
        <div className="experience-legend"><span><i /> Información publicada por administración</span><a href="#calendario">Ver también la agenda general ↑</a></div>
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
          <a href="#experiencias-del-mes" onClick={() => setOpen(false)}>Información pública</a>
          <Link href="/portal" onClick={() => setOpen(false)}>Liderazgo</Link>
          <Link href="/etica" onClick={() => setOpen(false)}>Ética y educación</Link>
          <Link href="/centros" onClick={() => setOpen(false)}>Centros</Link>
          <Link href="/administracion" onClick={() => setOpen(false)}>Administración</Link>
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
  return <footer className="footer"><div className="shell footer-grid"><div className="footer-brand"><Logo /><div><strong>Fraternidad Guerreros de la Luz A.C.</strong><span>Unidad · Servicio · Responsabilidad</span></div></div><div className="footer-links"><a href="#experiencias-del-mes">Público</a><Link href="/portal">Liderazgo</Link><Link href="/etica">Ética</Link><Link href="/centros">Centros</Link><Link href="/administracion">Administración</Link></div><p>© 2026 FGDLL<br />Ecosistema institucional.</p></div></footer>;
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
              <p>Un ecosistema institucional para consultar información pública, fortalecer el liderazgo, conocer derechos, encontrar centros y administrar la red.</p>
              <div className="hero-actions"><a className="button button-gold" href="#experiencias-del-mes">Ver información pública <span>↓</span></a><Link className="button button-ghost" href="/portal">Entrar a Liderazgo</Link></div>
              <div className="trust-line"><span><b>{directoryGroups.length}</b> grupos registrados</span><span><b>5</b> zonas nacionales</span><span><b>28</b> centros Teocalli</span></div>
            </div>
            <div className="hero-console" aria-label="Resumen del portal">
              <div className="console-header"><span><i /><i /><i /></span><small>PORTAL FGDLL / 2026</small></div>
              <div className="console-welcome"><span>ECOSISTEMA FGDLL</span><h2>Cinco áreas claras.<br />Una misma misión.</h2></div>
              <div className="console-grid">
                <a href="#experiencias-del-mes"><small>01 · PÚBLICO</small><strong>Información</strong><span>Agenda y directorio →</span></a>
                <Link href="/portal"><small>02 · PRIVADO</small><strong>Liderazgo</strong><span>Avisos y materiales →</span></Link>
                <Link href="/etica"><small>03 · EDUCATIVO</small><strong>Ética</strong><span>Derechos y estructura →</span></Link>
                <Link href="/administracion"><small>05 · POR PERFIL</small><strong>Administración</strong><span>Datos y propuestas →</span></Link>
              </div>
              <div className="console-status"><span className="pulse" /> Información actualizada para el ciclo 2026</div>
            </div>
          </div>
        </section>

        <section className="manifesto"><div className="shell"><p>El liderazgo no es un privilegio. <strong>Es una responsabilidad de servicio.</strong></p><span>Este portal pone orden a la información para que la luz llegue más lejos.</span></div></section>

        <section className="section services-section">
          <div className="shell service-grid">
            <div className="service-intro"><span className="eyebrow light">Estructura principal</span><h2>Entra por el propósito correcto.</h2><p>Cada área tiene una función definida y muestra únicamente las herramientas que corresponden a su público.</p><Link className="button button-gold" href="/portal">Abrir área de Liderazgo →</Link></div>
            <div className="service-cards">
              <a href="#experiencias-del-mes"><span>01 · PÚBLICO</span><div><h3>Información pública</h3><p>Experiencias, agenda general, zonas y directorio nacional.</p></div><b>↓</b></a>
              <Link href="/portal"><span>02 · 🔒</span><div><h3>Liderazgo</h3><p>Avisos, documentos, testimonios y Universidad FGDLL.</p></div><b>↗</b></Link>
              <Link href="/etica"><span>03</span><div><h3>Ética y educación</h3><p>Derechos, responsabilidades, organigrama y la Asociación Civil.</p></div><b>↗</b></Link>
              <Link href="/centros"><span>04</span><div><h3>Centros y tratamiento</h3><p>Información del tratamiento residencial y directorio Teocalli.</p></div><b>↗</b></Link>
              <Link href="/administracion"><span>05 · 🔒</span><div><h3>Administración</h3><p>Actualización de datos, propuestas y registro de nuevos grupos.</p></div><b>↗</b></Link>
            </div>
          </div>
        </section>

        <MonthlyExperiences />

        <CalendarAgenda />

        <Directory groups={directoryGroups} />

        <section className="section zones-section" id="red">
          <div className="shell">
            <div className="section-heading"><span className="eyebrow">Nuestra red nacional</span><h2>Cinco zonas. Una misma misión.</h2><p>Cada zona sostiene una parte del servicio y todas caminan bajo un propósito común.</p></div>
            <div className="zone-grid">
              {Object.entries(zoneMeta).map(([name, meta], i) => <button key={name} className={`zone-card zone-${i + 1}`} onClick={() => document.getElementById("directorio")?.scrollIntoView({ behavior: "smooth" })}><span className="zone-number">0{i + 1}</span><span className="zone-letter">{meta.icon}</span><h3>Zona {name}</h3><p>{meta.line}</p><strong>{counts[name] ?? 0} grupos <b>↗</b></strong></button>)}
              <Link className="zone-card zone-teocalli" href="/centros"><span className="zone-number">06</span><span className="zone-letter">T</span><h3>Centros Teocalli</h3><p>Rehabilitación y acompañamiento</p><strong>28 centros <b>↗</b></strong></Link>
            </div>
          </div>
        </section>

        <section className="closing"><div className="shell"><span className="eyebrow light">Seguimos caminando</span><h2>La tecnología no sustituye<br />el corazón del servicio.</h2><p>Lo organiza para que cada líder pueda dedicar más tiempo a lo que verdaderamente importa: acompañar, formar y servir.</p><Link className="button button-gold" href="/portal">Abrir Portal de Líderes →</Link></div></section>
      </main>
      <Footer />
    </>
  );
}
