"use client";

import { useMemo, useState } from "react";
import data from "../directory-data.json";
import { SubFooter, SubHeader } from "../section-shell";

export default function CentersPage() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("Todos");
  const families = ["Todos", ...Array.from(new Set(data.centros.map((c) => c.familia)))];
  const filtered = useMemo(() => data.centros.filter((c) => {
    const text = `${c.nombre} ${c.familia} ${c.direccion} ${c.responsable}`.toLocaleLowerCase("es");
    return (family === "Todos" || c.familia === family) && text.includes(query.toLocaleLowerCase("es").trim());
  }), [query, family]);
  return <><SubHeader label="Centros Teocalli" /><main className="subpage centers-page">
    <section className="subhero centers-hero"><div className="shell subhero-grid"><div><span className="eyebrow light">Directorio autorizado</span><h1>Un lugar cercano<br /><em>para volver a empezar.</em></h1><p>Consulta ubicación, responsable y medios de contacto de los centros afiliados a la red Teocalli.</p></div><div className="center-stat"><strong>28</strong><span>centros registrados</span><p>Atención en Yucatán y Quintana Roo</p></div></div></section>
    <section className="section center-directory"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Red Teocalli</span><h2>Encuentra el centro indicado.</h2></div><p>La información se presenta como fue registrada. Confirma disponibilidad y proceso de ingreso directamente con el centro.</p></div><div className="directory-tools"><label className="search-field"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, colonia o responsable…" /></label><div className="filter-row">{families.map((item) => <button key={item} className={family === item ? "active" : ""} onClick={() => setFamily(item)}>{item}</button>)}</div></div><div className="result-line">Mostrando <strong>{filtered.length}</strong> de {data.centros.length} centros</div><div className="centers-grid">{filtered.map((c) => <article className="center-card" key={c.n}><div className="center-card-head"><span>{String(c.n).padStart(2, "0")}</span><small>{c.familia}</small></div><h3>{c.nombre}</h3><dl><div><dt>Ubicación</dt><dd>{c.direccion}</dd></div><div><dt>Responsable</dt><dd>{c.responsable}</dd></div></dl><div className="center-actions"><a href={`tel:+52${c.tel}`}>Llamar</a><a className="whatsapp" href={`https://wa.me/52${c.tel}?text=${encodeURIComponent(`Hola, solicito información sobre ${c.nombre}.`)}`} target="_blank" rel="noreferrer">WhatsApp</a></div></article>)}</div>{filtered.length === 0 && <div className="empty-state"><strong>No encontramos centros.</strong><span>Intenta con otra palabra o familia.</span></div>}</div></section>
    <section className="care-note"><div className="shell"><span>IMPORTANTE</span><h2>Un adicto necesita ayuda, no castigo.</h2><p>Si existe una emergencia médica o riesgo inmediato para la vida, llama al 911. Este directorio orienta el contacto; no sustituye atención profesional de urgencia.</p></div></section>
  </main><SubFooter /></>;
}
