"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { SubFooter, SubHeader } from "../section-shell";

const criteria = [
  ["Maltrato o abuso de autoridad", "Gritos, humillaciones, amenazas o uso del servicio para controlar."],
  ["Riesgos de seguridad", "Situaciones que comprometen la integridad física o emocional."],
  ["Confidencialidad", "Exposición indebida de procesos, testimonios o información sensible."],
  ["Conducta inapropiada", "Acciones que dañan la confianza del grupo o la comunidad."],
  ["Uso indebido de recursos", "Manejo poco claro de materiales, espacios o apoyos."],
  ["Orientación preventiva", "Dudas que conviene atender antes de que la situación crezca."],
];

export default function EthicsPage() {
  const [folio, setFolio] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = Math.random().toString(36).slice(2, 6).toUpperCase();
    setFolio(`FGDLL-2026-${token}`);
  }
  return <><div className="emergency">Si existe riesgo inmediato para tu vida o integridad física, llama al <a href="tel:911">911</a>.</div><SubHeader label="Ética e Integridad" /><main className="subpage ethics-page">
    <section className="subhero ethics-hero"><div className="shell"><span className="eyebrow light">Puerto seguro institucional</span><h1>La dignidad también<br /><em>se protege.</em></h1><p>Un espacio para orientar, escuchar y ordenar situaciones que afectan la seguridad, la confianza o la integridad del servicio.</p><div className="hero-actions"><a className="button button-gold" href="#reporte">Orientación de reporte →</a><a className="button button-ghost" href="#derechos">Conocer mis derechos</a></div></div></section>
    <section className="section rights-section" id="derechos"><div className="shell"><div className="section-heading"><span className="eyebrow">Principio de cuidado</span><h2>La disciplina verdadera sostiene. No humilla.</h2><p>El servicio jamás justifica el maltrato. Toda persona merece ser escuchada, tratada con respeto y orientada con responsabilidad.</p></div><div className="rights-grid"><article><span>01</span><h3>Ser escuchado</h3><p>Pedir orientación sin recibir burla, amenaza o exposición pública.</p></article><article><span>02</span><h3>Ser tratado con respeto</h3><p>Recibir corrección cuidando la dignidad y el bienestar común.</p></article><article><span>03</span><h3>Pedir ayuda</h3><p>Ser canalizado cuando una situación rebasa los alcances del servicio.</p></article></div></div></section>
    <section className="section reportable"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Criterios de orientación</span><h2>¿Qué se puede reportar?</h2></div><p>Este canal sirve para ordenar hechos concretos, no para rumores ni conflictos sin información verificable.</p></div><div className="criteria-grid">{criteria.map(([title, text], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="section report-section" id="reporte"><div className="shell report-layout"><div><span className="eyebrow">Reporte responsable</span><h2>Cuenta los hechos con orden y claridad.</h2><p>Esta demostración genera un folio únicamente en tu dispositivo. La información no se envía ni se guarda porque todavía falta conectar el canal institucional seguro.</p><ul><li>Describe qué pasó y dónde.</li><li>Indica la fecha aproximada.</li><li>Separa los hechos de interpretaciones.</li><li>Conserva evidencia sin difundirla.</li></ul></div><form onSubmit={submit} className="report-form"><label>Tipo de situación<select required defaultValue=""><option value="" disabled>Selecciona una opción</option>{criteria.map(([title]) => <option key={title}>{title}</option>)}</select></label><label>Zona o grupo relacionado<input placeholder="Ej. Zona Jaguar / Grupo…" /></label><label>Fecha aproximada<input type="date" /></label><label>Relato de los hechos<textarea required placeholder="Qué ocurrió, dónde, quiénes estaban presentes y qué necesitas que se revise…" /></label><button className="button button-gold" type="submit">Generar folio demostrativo</button>{folio && <div className="folio"><span>Folio local</span><strong>{folio}</strong><small>No confirma el envío de un reporte.</small></div>}</form></div></section>
    <section className="ethics-closing"><div className="shell"><h2>La luz también se cuida con límites.</h2><p>El objetivo no es castigar desde el juicio, sino proteger desde la verdad, el respeto y la responsabilidad.</p><Link className="button button-gold" href="/portal">Volver al portal →</Link></div></section>
  </main><SubFooter /></>;
}
