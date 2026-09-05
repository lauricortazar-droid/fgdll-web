"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import calendarData from "./calendar-data.json";
import monthlyExperienceData from "./monthly-experiences-data.json";
import publicData from "./public-directory-data.json";
import {
  groupHref, locationParts, type PublicGroup, verificationLabel, whatsappHref, zoneHref, zoneMeta,
} from "./public-directory";

type CalendarEvent = { id: string; title: string; start: string; end: string; location: string | null; url: string | null };
type MonthlyExperience = {
  id: string; month: string; zone: string; title: string; startDate: string; endDate: string;
  location: string; writings: string[]; notes: string; status: string;
};

const initialGroups = publicData.grupos as PublicGroup[];
const agendaEvents = calendarData as CalendarEvent[];
const initialExperiences = monthlyExperienceData as MonthlyExperience[];
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
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" })
    .format(dateFromYmd(value)).replace(".", "");
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

function experienceDate(item: MonthlyExperience) {
  const startDay = Number(item.startDate.slice(8, 10));
  const endDay = Number(item.endDate.slice(8, 10));
  if (item.startDate === item.endDate) return `${startDay} de ${shortMonth(item.startDate)}`;
  if (item.startDate.slice(0, 7) === item.endDate.slice(0, 7)) return `${startDay}–${endDay} de ${shortMonth(item.startDate)}`;
  return `${startDay} de ${shortMonth(item.startDate)} – ${endDay} de ${shortMonth(item.endDate)}`;
}

function Logo() {
  return <span className="brand-shield" aria-hidden="true"><img src="/logo-gdll.png" alt="" /></span>;
}

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="topbar"><div className="shell nav-shell">
    <Link className="brand" href="/" onClick={() => setOpen(false)}><Logo /><span><strong>FGDLL</strong><small>Guerreros de la Luz</small></span></Link>
    <button className="menu-button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /><span /></button>
    <nav className={open ? "main-nav open" : "main-nav"} aria-label="Navegación principal">
      <Link className="nav-help" href="/necesito-orientacion" onClick={() => setOpen(false)}>Necesito ayuda</Link>
      <a href="#directorio" onClick={() => setOpen(false)}>Encuentra un grupo</a>
      <Link href="/centros" onClick={() => setOpen(false)}>Centros</Link>
      <a href="#agenda" onClick={() => setOpen(false)}>Agenda</a>
      <Link href="/universidad" onClick={() => setOpen(false)}>Universidad</Link>
      <Link href="/portal" onClick={() => setOpen(false)}>Acceso de liderazgo</Link>
    </nav>
  </div></header>;
}

function Finder({ groups }: { groups: PublicGroup[] }) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("Todas");
  const [state, setState] = useState("Todos");
  const [city, setCity] = useState("Todas");
  const [limit, setLimit] = useState(12);
  const [geoMessage, setGeoMessage] = useState("");

  const states = useMemo(() => Array.from(new Set(groups.map((group) => locationParts(group.city).state)))
    .filter((item) => item !== "Sin especificar").sort((a, b) => a.localeCompare(b, "es")), [groups]);
  const cities = useMemo(() => Array.from(new Set(groups
    .filter((group) => state === "Todos" || locationParts(group.city).state === state)
    .map((group) => locationParts(group.city).city))).sort((a, b) => a.localeCompare(b, "es")), [groups, state]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return groups.filter((group) => {
      const location = locationParts(group.city);
      const haystack = `${group.name} ${group.city} ${group.address} ${group.zone}`.toLocaleLowerCase("es");
      return (zone === "Todas" || group.zone === zone)
        && (state === "Todos" || location.state === state)
        && (city === "Todas" || location.city === city)
        && (!term || haystack.includes(term));
    });
  }, [groups, query, zone, state, city]);

  function nearMe() {
    setGeoMessage("Buscando tu ubicación…");
    if (!navigator.geolocation) { setGeoMessage("Tu navegador no permite usar la ubicación."); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const url = `https://www.google.com/maps/search/Guerreros+de+la+Luz/@${coords.latitude},${coords.longitude},11z`;
      window.open(url, "_blank", "noopener,noreferrer");
      setGeoMessage("Abrimos un mapa alrededor de tu ubicación.");
    }, () => setGeoMessage("No pudimos obtener tu ubicación. Usa los filtros de ciudad o estado."), { timeout: 8000 });
  }

  return <section className="section directory-section finder" id="directorio"><div className="shell">
    <div className="section-heading split-heading"><div><span className="eyebrow">Directorio público</span><h2>Encuentra un grupo cerca de ti.</h2></div><p>Consulta únicamente información autorizada para atención pública. Los datos personales de líderes y responsables permanecen protegidos.</p></div>
    <div className="finder-panel">
      <label className="finder-search"><span>Buscar</span><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(12); }} placeholder="Nombre del grupo, ciudad o colonia" /></label>
      <label><span>Estado</span><select value={state} onChange={(event) => { setState(event.target.value); setCity("Todas"); setLimit(12); }}><option>Todos</option>{states.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Ciudad</span><select value={city} onChange={(event) => { setCity(event.target.value); setLimit(12); }}><option>Todas</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Zona</span><select value={zone} onChange={(event) => { setZone(event.target.value); setLimit(12); }}><option>Todas</option>{zoneNames.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="near-button" type="button" onClick={nearMe}><span aria-hidden="true">⌖</span> Cerca de mí</button>
    </div>
    {geoMessage && <p className="geo-message" role="status">{geoMessage}</p>}
    <div className="result-line"><span><strong>{filtered.length}</strong> {filtered.length === 1 ? "grupo encontrado" : "grupos encontrados"}</span>{(query || zone !== "Todas" || state !== "Todos" || city !== "Todas") && <button onClick={() => { setQuery(""); setZone("Todas"); setState("Todos"); setCity("Todas"); }}>Limpiar filtros</button>}</div>
    <div className="directory-grid">{filtered.slice(0, limit).map((group) => <article className="group-card public-group-card" key={group.id}>
      <div className="group-top"><span className="zone-dot">{zoneMeta[group.zone]?.icon ?? group.zone.charAt(0)}</span><span>Zona {group.zone}</span><small>{group.publicCode}</small></div>
      <h3>{group.name}</h3><p className="location">{group.city || "Ubicación por confirmar"}</p>
      <dl>{group.schedules && <div><dt>Juntas</dt><dd>{group.schedules}</dd></div>}{group.address && <div><dt>Dirección</dt><dd>{group.address}</dd></div>}</dl>
      <div className={`verification ${group.verifiedAt ? "verified" : "pending"}`}><i />{verificationLabel(group.verifiedAt)}</div>
      <div className="card-actions primary-actions">
        {group.whatsapp && <a href={whatsappHref(group.whatsapp)} target="_blank" rel="noreferrer">WhatsApp</a>}
        {group.mapsUrl && <a href={group.mapsUrl} target="_blank" rel="noreferrer">Cómo llegar</a>}
        <Link href={groupHref(group)}>Ver grupo</Link>
      </div>
    </article>)}</div>
    {!filtered.length && <div className="empty-state"><strong>No encontramos coincidencias.</strong><span>Prueba con otra ciudad, estado o zona. Si necesitas orientación, podemos ayudarte a encontrar el camino más cercano.</span><Link className="button button-gold" href="/necesito-orientacion">Pedir orientación</Link></div>}
    {limit < filtered.length && <div className="center-action"><button className="button button-outline" onClick={() => setLimit(limit + 12)}>Mostrar más grupos</button></div>}
  </div></section>;
}

function MonthlyExperiences() {
  const [items, setItems] = useState(initialExperiences);
  const months = useMemo(() => Array.from(new Set(items.map((item) => item.month))).sort(), [items]);
  const [activeMonth, setActiveMonth] = useState(months[0] ?? "");
  useEffect(() => {
    let active = true;
    fetch("/api/monthly-experiences", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => { if (active && Array.isArray(result.experiences) && result.experiences.length) setItems(result.experiences); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const monthItems = items.filter((item) => item.month === activeMonth);
  return <section className="section monthly-experiences" id="experiencias"><div className="shell">
    <div className="section-heading split-heading monthly-experience-heading"><div><span className="eyebrow light">Experiencias</span><h2>Cada zona, su fecha y sus escrituras.</h2></div><p>Fechas, sedes y escrituras publicadas desde una sola agenda institucional.</p></div>
    <div className="experience-month-tabs" role="tablist" aria-label="Meses de experiencias">{months.map((month) => <button key={month} type="button" role="tab" aria-selected={activeMonth === month} className={activeMonth === month ? "active" : ""} onClick={() => setActiveMonth(month)}>{monthLabel(month)}</button>)}</div>
    <div className="experience-zone-grid" role="tabpanel">{zoneNames.map((zone, index) => {
      const zoneItems = monthItems.filter((item) => item.zone === zone);
      return <article className={`experience-zone-card experience-zone-${index + 1}`} key={zone}><header><span>{zoneMeta[zone].icon}</span><div><small>ZONA</small><h3>{zone}</h3></div></header>
        {zoneItems.length ? zoneItems.map((item) => <div className="experience-entry" key={item.id}><div className="experience-date"><span>FECHA</span><strong>{experienceDate(item)}</strong></div><h4>{item.title}</h4>{item.location && <p className="experience-location">⌖ {item.location}</p>}<div className="writing-block"><span>ESCRITURAS DISPONIBLES</span><div>{item.writings.length ? item.writings.map((writing) => <b key={writing}>{writing}</b>) : <em>Por confirmar</em>}</div></div></div>) : <div className="experience-empty"><span>—</span><strong>Sin experiencia publicada</strong><p>La fecha aparecerá cuando sea confirmada.</p></div>}
      </article>;
    })}</div>
  </div></section>;
}

function CalendarAgenda() {
  const months = useMemo(() => Array.from(new Set(agendaEvents.map((event) => event.start.slice(0, 7)))), []);
  const [activeMonth, setActiveMonth] = useState(months[0] ?? "");
  const events = agendaEvents.filter((event) => event.start.startsWith(activeMonth));
  return <section className="section calendar-section" id="agenda"><div className="shell">
    <div className="section-heading split-heading"><div><span className="eyebrow">Agenda FGDLL</span><h2>Una sola agenda para toda la red.</h2></div><p>Eventos vigentes y próximos. La misma información alimenta la portada, las zonas y el portal de liderazgo.</p></div>
    <div className="month-tabs" role="tablist" aria-label="Meses de la agenda">{months.map((month) => <button key={month} type="button" role="tab" aria-selected={activeMonth === month} className={activeMonth === month ? "active" : ""} onClick={() => setActiveMonth(month)}>{monthLabel(month)}</button>)}</div>
    <div className="month-panel" role="tabpanel"><div className="month-heading"><h3>{monthLabel(activeMonth)}</h3><span>{events.length} {events.length === 1 ? "evento" : "eventos"}</span></div><div className="event-list">{events.map((event, index) => <article className="event-row" key={event.id}><span className="event-index">{String(index + 1).padStart(2, "0")}</span><div className="event-when"><time>{eventDate(event)}</time><span>{eventTime(event)}</span></div><div className="event-main"><h3>{event.title}</h3>{event.location && <p className="event-location">⌖ {event.location}</p>}</div>{event.url ? <a className="event-link" href={event.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${event.title} en Google Calendar`}>↗</a> : <span />}</article>)}</div></div>
    <p className="calendar-source">Fuente única: AGENDA FGDLL · Actualización institucional.</p>
  </div></section>;
}

function Footer() {
  return <footer className="footer"><div className="shell footer-grid"><div className="footer-brand"><Logo /><div><strong>Fraternidad Guerreros de la Luz A.C.</strong><span>Que nadie sufra solo.</span></div></div><div className="footer-links"><Link href="/necesito-orientacion">Necesito ayuda</Link><a href="#directorio">Directorio</a><Link href="/centros">Centros</Link><Link href="/etica">Ética</Link><Link href="/portal">Liderazgo</Link></div><p>© 2026 FGDLL<br />Información institucional.</p></div></footer>;
}

export default function Home() {
  const [groups, setGroups] = useState(initialGroups);
  useEffect(() => {
    let active = true;
    fetch("/api/directory", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => { if (active && Array.isArray(result.groups) && result.groups.length) setGroups(result.groups); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const counts = groups.reduce<Record<string, number>>((acc, group) => { acc[group.zone] = (acc[group.zone] ?? 0) + 1; return acc; }, {});

  return <><Header /><main>
    <section className="public-hero" id="inicio"><div className="hero-orb hero-orb-one" /><div className="shell public-hero-grid"><div className="public-hero-copy"><span className="eyebrow light">Fraternidad Guerreros de la Luz</span><h1>Que nadie<br /><em>sufra solo.</em></h1><p>Hay un lugar para ti. Encuentra un grupo de Guerreros de la Luz cerca de donde estás.</p><div className="hero-actions"><a className="button button-gold" href="#directorio">Encontrar un grupo</a><Link className="button button-ghost" href="/necesito-orientacion">Necesito orientación</Link></div><div className="public-trust"><span><b>{groups.length}</b> grupos en el directorio</span><span><b>5</b> zonas</span><span><b>18</b> años de historia</span></div></div><aside className="first-time-card"><span>¿ES TU PRIMERA VEZ?</span><h2>No tienes que llegar sabiendo qué decir.</h2><p>Puedes acercarte, escuchar y preguntar. Aquí encontrarás dirección, horarios y una forma directa de contactar al grupo.</p><a href="#directorio">Buscar ahora <b>↓</b></a><Link href="/necesito-orientacion">Conocer las formas de pedir ayuda <b>→</b></Link></aside></div></section>

    <section className="help-paths"><div className="shell"><div><span>NECESITO APOYO</span><h2>Da el primer paso que sí puedes dar hoy.</h2></div><div className="help-path-grid"><Link href="/necesito-orientacion#para-mi"><b>01</b><strong>Busco ayuda para mí</strong><span>Hablar y encontrar un grupo →</span></Link><Link href="/necesito-orientacion#para-alguien"><b>02</b><strong>Busco ayuda para alguien que quiero</strong><span>Orientación para acompañar →</span></Link><Link href="/necesito-orientacion#hablar"><b>03</b><strong>Solo necesito hablar con alguien</strong><span>Ver opciones de contacto →</span></Link></div></div></section>

    <Finder groups={groups} />

    <section className="section network-map" id="mapa"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Mapa nacional</span><h2>Cinco zonas. Una sola fraternidad.</h2></div><p>Explora cada zona, consulta sus grupos y abre la ubicación registrada para llegar sin perderte.</p></div><div className="national-map-board"><div className="map-core"><Logo /><strong>FGDLL</strong><span>Red nacional</span></div>{zoneNames.map((zone, index) => <Link key={zone} href={zoneHref(zone)} className={`map-zone map-zone-${index + 1}`}><span>{zoneMeta[zone].icon}</span><div><small>ZONA</small><strong>{zone}</strong><em>{counts[zone] ?? 0} grupos</em></div><b>→</b></Link>)}</div></div></section>

    <MonthlyExperiences />
    <CalendarAgenda />

    <section className="section history-section" id="conocenos"><div className="shell history-grid"><div><span className="history-number">18</span><small>AÑOS CAMINANDO JUNTOS</small></div><div><span className="eyebrow">Conócenos</span><h2>Una historia hecha de personas que decidieron volver por alguien más.</h2><p>Guerreros de la Luz nació en 2008 con una convicción sencilla: el dolor no debe vivirse en soledad. Hoy seguimos abriendo espacios de recuperación, servicio, formación y comunidad.</p><Link className="button button-outline" href="/etica">Conocer nuestros principios</Link></div></div></section>

    <section className="closing public-closing"><div className="shell"><span className="eyebrow light">Aquí comienza el camino</span><h2>No tienes que resolver toda tu vida hoy.</h2><p>Solo necesitas dar un primer paso acompañado.</p><div className="hero-actions"><a className="button button-gold" href="#directorio">Encontrar un grupo</a><Link className="button button-ghost" href="/portal">Acceso de liderazgo</Link></div></div></section>
  </main><Footer /></>;
}
