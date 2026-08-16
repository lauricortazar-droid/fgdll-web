"use client";

import { useMemo, useState } from "react";
import data from "../directory-data.json";
import { SubFooter, SubHeader } from "../section-shell";

const treatmentSteps = [
  ["01", "Primer contacto", "La familia o la persona solicita información, explica la situación y confirma disponibilidad."],
  ["02", "Valoración e ingreso", "El centro explica requisitos, condiciones, costos, reglas, responsables y posibles criterios de canalización."],
  ["03", "Estancia residencial", "Se desarrolla el programa del centro con rutinas, acompañamiento, convivencia, actividades y seguimiento del proceso."],
  ["04", "Egreso y continuidad", "Se prepara la salida y se acuerdan apoyos de seguimiento, red familiar, grupo y atención profesional cuando corresponda."],
];

const admissionQuestions = ["¿Quién es el responsable legal y operativo?", "¿Qué profesionales participan y cómo se acreditan?", "¿Cuáles son las reglas, costos y duración estimada?", "¿Cómo se atienden urgencias médicas o de salud mental?", "¿Qué comunicación tendrá la familia?", "¿Cómo se protegen la dignidad y los datos personales?", "¿Qué seguimiento existe después del egreso?"];

export default function CentersPage() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("Todos");
  const families = ["Todos", ...Array.from(new Set(data.centros.map((c) => c.familia)))];
  const filtered = useMemo(() => data.centros.filter((c) => {
    const text = `${c.nombre} ${c.familia} ${c.direccion} ${c.responsable}`.toLocaleLowerCase("es");
    return (family === "Todos" || c.familia === family) && text.includes(query.toLocaleLowerCase("es").trim());
  }), [query, family]);
  return <><SubHeader label="Centros y tratamiento" /><main className="subpage centers-page residential-page">
    <section className="subhero centers-hero"><div className="shell subhero-grid"><div><span className="eyebrow light">Tratamiento residencial · Red Teocalli</span><h1>Información clara<br /><em>antes de decidir.</em></h1><p>Conoce en qué consiste una atención residencial, qué debes preguntar y cómo contactar a los centros afiliados.</p><div className="hero-actions"><a className="button button-gold" href="#tratamiento">Conocer el proceso ↓</a><a className="button button-ghost" href="#directorio-centros">Buscar un centro</a></div></div><div className="center-stat"><strong>{data.centros.length}</strong><span>centros registrados</span><p>Confirma directamente disponibilidad, requisitos y condiciones de ingreso.</p></div></div></section>
    <section className="section treatment-overview" id="tratamiento"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Orientación inicial</span><h2>¿Qué es el tratamiento residencial?</h2></div><p>Es una modalidad de atención en la que la persona permanece temporalmente en un centro con estructura cotidiana y acompañamiento. Cada establecimiento debe explicar con precisión su modelo, alcances y responsables.</p></div><div className="treatment-step-grid">{treatmentSteps.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div><div className="treatment-boundary"><strong>Importante</strong><p>FGDLL orienta el contacto y la red comunitaria. La atención residencial no sustituye servicios médicos, psiquiátricos o psicológicos cuando éstos son necesarios.</p></div></div></section>
    <section className="section admission-section"><div className="shell admission-grid"><div><span className="eyebrow light">Antes del ingreso</span><h2>Preguntas que protegen a la persona y a su familia.</h2><p>No tomes una decisión únicamente por urgencia o presión. Solicita respuestas claras y conserva por escrito la información esencial.</p></div><ol>{admissionQuestions.map((question, index) => <li key={question}><span>{String(index + 1).padStart(2, "0")}</span><p>{question}</p></li>)}</ol></div></section>
    <section className="section center-directory" id="directorio-centros"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Directorio autorizado</span><h2>Encuentra el centro indicado.</h2></div><p>La información se presenta como fue registrada. Confirma directamente disponibilidad, programa, costos, derechos, comunicación familiar y proceso de ingreso.</p></div><div className="directory-tools"><label className="search-field"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, colonia o responsable…" /></label><div className="filter-row">{families.map((item) => <button key={item} className={family === item ? "active" : ""} onClick={() => setFamily(item)}>{item}</button>)}</div></div><div className="result-line">Mostrando <strong>{filtered.length}</strong> de {data.centros.length} centros</div><div className="centers-grid">{filtered.map((c) => <article className="center-card" key={c.n}><div className="center-card-head"><span>{String(c.n).padStart(2, "0")}</span><small>{c.familia}</small></div><h3>{c.nombre}</h3><dl><div><dt>Ubicación</dt><dd>{c.direccion}</dd></div><div><dt>Responsable registrado</dt><dd>{c.responsable}</dd></div></dl><div className="center-actions"><a href={`tel:+52${c.tel}`}>Llamar</a><a className="whatsapp" href={`https://wa.me/52${c.tel}?text=${encodeURIComponent(`Hola, solicito información sobre ${c.nombre}.`)}`} target="_blank" rel="noreferrer">WhatsApp</a></div></article>)}</div>{filtered.length === 0 && <div className="empty-state"><strong>No encontramos centros.</strong><span>Intenta con otra palabra o familia.</span></div>}</div></section>
    <section className="care-note"><div className="shell"><span>EMERGENCIA</span><h2>Un adicto necesita ayuda, no castigo.</h2><p>Si existe una emergencia médica, riesgo de suicidio, violencia o peligro inmediato para la vida, llama al 911. Este directorio no sustituye atención profesional de urgencia.</p></div></section>
  </main><SubFooter /></>;
}
