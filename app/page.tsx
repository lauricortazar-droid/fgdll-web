"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import data from "./directory-data.json";

const zoneMeta: Record<string, { icon: string; line: string }> = {
  Jaguar: { icon: "J", line: "Fuerza y servicio" },
  "Tiburón": { icon: "T", line: "Determinación" },
  "Delfín": { icon: "D", line: "Renacimiento" },
  "Colibrí": { icon: "C", line: "Transformación" },
  "Águila": { icon: "A", line: "Visión elevada" },
};

const upcoming = [
  { date: "14–16 AGO", zone: "Jaguar", title: "Experiencia mensual", detail: "Internos · Jóvenes · Adultos · Perdón y Amor" },
  { date: "14–16 AGO", zone: "Águila", title: "Familiar · Adictos", detail: "La Magia del Amor" },
  { date: "28–30 AGO", zone: "Delfín", title: "Sala de Primera", detail: "La Magia del Perdón" },
  { date: "11–13 SEP", zone: "Jaguar", title: "Experiencia mensual", detail: "Llegamos a Creer · Seguimiento de Jóvenes" },
  { date: "11–13 SEP", zone: "Colibrí", title: "Familia · Usuarios", detail: "La Magia del Amor" },
  { date: "9–11 OCT", zone: "Nacional", title: "Aniversario FGDLL", detail: "Encuentro de la Fraternidad" },
];

function Logo() {
  return <span className="logo-mark" aria-hidden="true"><i /><b /></span>;
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
          <a href="#red" onClick={() => setOpen(false)}>Red nacional</a>
          <a href="#calendario" onClick={() => setOpen(false)}>Calendario</a>
          <Link href="/universidad">Universidad</Link>
          <Link href="/testimonios">Testimonios</Link>
          <Link href="/centros">Centros Teocalli</Link>
          <Link href="/etica">Ética</Link>
          <Link className="button button-gold button-small" href="/portal">Abrir portal</Link>
        </nav>
      </div>
    </header>
  );
}

function Directory() {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("Todas");
  const [limit, setLimit] = useState(9);
  const zones = ["Todas", ...Object.keys(zoneMeta)];
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return data.grupos.filter((g) => {
      const inZone = zone === "Todas" || g.zona === zone;
      const haystack = `${g.nombre} ${g.ciudad} ${g.lider} ${g.direccion} ${g.zona}`.toLocaleLowerCase("es");
      return inZone && (!term || haystack.includes(term));
    });
  }, [query, zone]);

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
          {filtered.slice(0, limit).map((g, i) => (
            <article className="group-card" key={`${g.nombre}-${g.ciudad}-${i}`}>
              <div className="group-top"><span className="zone-dot">{zoneMeta[g.zona]?.icon ?? g.zona.charAt(0)}</span><span>{g.zona}</span></div>
              <h3>{g.nombre}</h3>
              <p className="location">{g.ciudad}</p>
              <dl><div><dt>Responsable</dt><dd>{g.lider}</dd></div>{g.direccion && <div><dt>Dirección</dt><dd>{g.direccion}</dd></div>}</dl>
              <div className="card-actions">
                <a href={`https://wa.me/52${g.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>
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
  const counts = data.grupos.reduce<Record<string, number>>((acc, g) => { acc[g.zona] = (acc[g.zona] ?? 0) + 1; return acc; }, {});
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
              <div className="hero-actions"><Link className="button button-gold" href="/portal">Entrar al portal <span>→</span></Link><a className="button button-ghost" href="#directorio">Buscar mi grupo</a></div>
              <div className="trust-line"><span><b>79</b> grupos registrados</span><span><b>5</b> zonas nacionales</span><span><b>28</b> centros Teocalli</span></div>
            </div>
            <div className="hero-console" aria-label="Resumen del portal">
              <div className="console-header"><span><i /><i /><i /></span><small>PORTAL FGDLL / 2026</small></div>
              <div className="console-welcome"><span>BUEN SERVICIO</span><h2>Todo lo importante,<br />en un mismo lugar.</h2></div>
              <div className="console-grid">
                <Link href="/portal"><small>01</small><strong>Operación</strong><span>Protocolos y formatos →</span></Link>
                <Link href="/universidad"><small>02</small><strong>Formación</strong><span>Diplomados y módulos →</span></Link>
                <Link href="/testimonios"><small>03</small><strong>Testimonios</strong><span>Temas y guías →</span></Link>
                <Link href="/etica"><small>04</small><strong>Integridad</strong><span>Orientación y reporte →</span></Link>
              </div>
              <div className="console-status"><span className="pulse" /> Información actualizada para el ciclo 2026</div>
            </div>
          </div>
        </section>

        <section className="manifesto"><div className="shell"><p>El liderazgo no es un privilegio. <strong>Es una responsabilidad de servicio.</strong></p><span>Este portal pone orden a la información para que la luz llegue más lejos.</span></div></section>

        <section className="section zones-section" id="red">
          <div className="shell">
            <div className="section-heading"><span className="eyebrow">Nuestra red nacional</span><h2>Cinco zonas. Una misma misión.</h2><p>Cada zona sostiene una parte del servicio y todas caminan bajo un propósito común.</p></div>
            <div className="zone-grid">
              {Object.entries(zoneMeta).map(([name, meta], i) => <button key={name} className={`zone-card zone-${i + 1}`} onClick={() => document.getElementById("directorio")?.scrollIntoView({ behavior: "smooth" })}><span className="zone-number">0{i + 1}</span><span className="zone-letter">{meta.icon}</span><h3>Zona {name}</h3><p>{meta.line}</p><strong>{counts[name] ?? 0} grupos <b>↗</b></strong></button>)}
              <Link className="zone-card zone-teocalli" href="/centros"><span className="zone-number">06</span><span className="zone-letter">T</span><h3>Centros Teocalli</h3><p>Rehabilitación y acompañamiento</p><strong>28 centros <b>↗</b></strong></Link>
            </div>
          </div>
        </section>

        <section className="section calendar-section" id="calendario">
          <div className="shell">
            <div className="section-heading split-heading"><div><span className="eyebrow">Agenda 2026</span><h2>Lo que viene en el camino.</h2></div><p>Fechas de referencia para orientar el servicio. Confirma siempre los detalles finales con la coordinación de tu zona.</p></div>
            <div className="event-list">{upcoming.map((e, i) => <article className="event-row" key={`${e.date}-${i}`}><span className="event-index">0{i + 1}</span><time>{e.date}</time><div><span>{e.zone}</span><h3>{e.title}</h3></div><p>{e.detail}</p><b>→</b></article>)}</div>
          </div>
        </section>

        <section className="section services-section">
          <div className="shell service-grid">
            <div className="service-intro"><span className="eyebrow light">Ecosistema FGDLL</span><h2>Herramientas para servir con claridad.</h2><p>No más información perdida en mensajes aislados. Cada área tiene una entrada clara y un propósito concreto.</p><Link className="button button-gold" href="/portal">Explorar el portal →</Link></div>
            <div className="service-cards">
              <Link href="/portal"><span>01</span><div><h3>Centro de Operaciones</h3><p>Protocolos, reglamentos y rutas de actuación.</p></div><b>↗</b></Link>
              <Link href="/universidad"><span>02</span><div><h3>Universidad FGDLL</h3><p>Diplomados organizados por nivel y generación.</p></div><b>↗</b></Link>
              <Link href="/testimonios"><span>03</span><div><h3>Biblioteca de Testimonios</h3><p>Temas, fuentes y preguntas para ordenar la experiencia.</p></div><b>↗</b></Link>
              <Link href="/centros"><span>04</span><div><h3>Red y Centros Teocalli</h3><p>Contactos autorizados y atención cercana.</p></div><b>↗</b></Link>
              <Link href="/etica"><span>05</span><div><h3>Ética e Integridad</h3><p>Orientación, cuidado y reporte responsable.</p></div><b>↗</b></Link>
            </div>
          </div>
        </section>

        <Directory />

        <section className="closing"><div className="shell"><span className="eyebrow light">Seguimos caminando</span><h2>La tecnología no sustituye<br />el corazón del servicio.</h2><p>Lo organiza para que cada líder pueda dedicar más tiempo a lo que verdaderamente importa: acompañar, formar y servir.</p><Link className="button button-gold" href="/portal">Abrir Portal de Líderes →</Link></div></section>
      </main>
      <Footer />
    </>
  );
}
