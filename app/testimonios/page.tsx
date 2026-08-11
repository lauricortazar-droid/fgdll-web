"use client";

import { useMemo, useState } from "react";
import rawData from "../testimonios-data.json";
import { SubFooter, SubHeader } from "../section-shell";

type Source = { obra?: string; referencia?: string; seccion?: string; uso?: string };
type Tema = {
  id: string; titulo: string; tituloCorto?: string; estado?: string; sensibilidad?: string;
  categoria?: string; intensidad?: string; momento?: string; tipoTestimonio?: string;
  emocion?: string; pasos?: string[]; objetivo?: string; fraseAncla?: string;
  desarrollo?: string; fuenteLibre?: string; palabrasClave?: string[];
  guiaTestimonio?: { detectar?: string[]; admitir?: string[]; corregir?: string[] };
  advertenciaEtica?: string; advertenciaLider?: string; noUsarPara?: string[];
  fuenteAA?: Source[]; fuenteFGDLL?: Source[];
};

const temas = rawData as Tema[];

function QuestionBlock({ n, title, subtitle, items }: { n: string; title: string; subtitle: string; items?: string[] }) {
  return <article className="question-block"><span>{n}</span><div><small>{subtitle}</small><h4>{title}</h4>{items?.length ? <ul>{items.map((q) => <li key={q}>{q}</li>)}</ul> : <p>Construye esta parte desde tu experiencia personal, sin teorizar ni aconsejar.</p>}</div></article>;
}

export default function TestimoniosPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sensitivity, setSensitivity] = useState("Todas");
  const [selected, setSelected] = useState<Tema | null>(null);
  const categories = ["Todas", ...Array.from(new Set(temas.map((t) => t.categoria).filter(Boolean) as string[]))];
  const filtered = useMemo(() => temas.filter((t) => {
    const text = `${t.titulo} ${t.tituloCorto ?? ""} ${t.fraseAncla ?? ""} ${(t.palabrasClave ?? []).join(" ")}`.toLocaleLowerCase("es");
    return (category === "Todas" || t.categoria === category) && (sensitivity === "Todas" || t.sensibilidad === sensitivity) && text.includes(query.trim().toLocaleLowerCase("es"));
  }), [query, category, sensitivity]);

  return <><SubHeader label="Biblioteca de Testimonios" /><main className="testimony-page">
    <section className="testimony-hero"><div className="shell"><span className="eyebrow light">Herramienta interna FGDLL</span><h1>El testimonio no es<br/>catarsis desordenada.<br/><em>Es experiencia ordenada.</em></h1><p>Temas con base de estudio para líderes, delegados y participantes de la Fraternidad Guerreros de la Luz.</p><div className="principle-line"><span>Detectar</span><i/> <span>Admitir</span><i/> <span>Corregir</span></div></div></section>
    <section className="testimony-intro"><div className="shell"><strong>71</strong><span>temas incorporados</span><p>Verdad + responsabilidad + esperanza</p></div></section>
    <section className="section testimony-library"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Explorar la biblioteca</span><h2>Encuentra el tema adecuado.</h2></div><p>Elige según el propósito, el momento y la sensibilidad del encuentro. Cada ficha ayuda a preparar; nunca sustituye la experiencia personal.</p></div>
      <div className="testimony-tools"><label className="search-field"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tema o palabra clave…"/></label><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">{categories.map((c)=><option key={c}>{c}</option>)}</select><select value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} aria-label="Sensibilidad"><option>Todas</option><option value="normal">Normal</option><option value="sensible">Sensible</option><option value="crisis">Crisis</option></select></div>
      <div className="result-line"><strong>{filtered.length}</strong> temas disponibles</div>
      <div className="testimony-grid">{filtered.map((t, i) => <button className="testimony-card" key={`${t.id}-${i}`} onClick={() => setSelected(t)}><div className="testimony-card-top"><span>{t.categoria ?? "Tema"}</span><small className={`sensitivity ${t.sensibilidad}`}>{t.sensibilidad ?? "normal"}</small></div><h3>{t.titulo}</h3><p>“{t.fraseAncla || t.tituloCorto || "Una experiencia que puede transmitir aprendizaje y esperanza."}”</p><div className="testimony-tags"><span>{t.tipoTestimonio ?? "Didáctico"}</span><span>{t.intensidad ?? "Media"}</span><span>{t.momento ?? "Mitad"}</span></div><strong>Ver ficha completa <b>→</b></strong></button>)}</div>
      {!filtered.length && <div className="empty-state"><strong>No encontramos temas.</strong><span>Prueba con otra categoría o palabra.</span></div>}
    </div></section>
    <section className="testimony-principles"><div className="shell"><div><span className="eyebrow light">Principio rector</span><h2>No transmitimos ocurrencias.</h2><p>Transmitimos experiencia, literatura y verdad vivida. El testimonio no es para impresionar; es para ordenar la experiencia y transmitir esperanza.</p></div><div className="principle-card"><span>01</span><strong>Verdad</strong><p>Hablar de lo vivido sin adornar ni esconder.</p><span>02</span><strong>Responsabilidad</strong><p>Reconocer la propia parte sin culpar ni exhibir.</p><span>03</span><strong>Esperanza</strong><p>Mostrar qué se está aprendiendo a corregir hoy.</p></div></div></section>
    {selected && <div className="testimony-modal" role="dialog" aria-modal="true" aria-labelledby="tema-title" onClick={() => setSelected(null)}><div className="testimony-sheet" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button><div className="sheet-head"><span>{selected.categoria}</span><h2 id="tema-title">{selected.titulo}</h2><p>“{selected.fraseAncla || selected.tituloCorto}”</p><div>{selected.tipoTestimonio && <small>{selected.tipoTestimonio}</small>}{selected.intensidad && <small>Intensidad {selected.intensidad}</small>}{selected.momento && <small>{selected.momento}</small>}</div></div><div className="sheet-body">
      <section><span className="sheet-label">Objetivo del testimonio</span><p>{selected.objetivo}</p>{selected.desarrollo && <blockquote>{selected.desarrollo}</blockquote>}</section>
      <section><span className="sheet-label">Guía de los tres tiempos</span><div className="question-grid"><QuestionBlock n="01" title="Detectar" subtitle="Antes del programa" items={selected.guiaTestimonio?.detectar}/><QuestionBlock n="02" title="Admitir" subtitle="Llegada a Guerreros" items={selected.guiaTestimonio?.admitir}/><QuestionBlock n="03" title="Corregir" subtitle="Hoy en recuperación" items={selected.guiaTestimonio?.corregir}/></div></section>
      {(selected.advertenciaEtica || selected.advertenciaLider || selected.noUsarPara?.length) && <section className="ethics-note"><span className="sheet-label">Manejo responsable para el líder</span>{selected.advertenciaEtica && <p><strong>Advertencia ética:</strong> {selected.advertenciaEtica}</p>}{selected.advertenciaLider && <p><strong>Nota para el líder:</strong> {selected.advertenciaLider}</p>}{selected.noUsarPara?.length ? <p><strong>No usar para:</strong> {selected.noUsarPara.join(" · ")}</p> : null}</section>}
      <section><span className="sheet-label">Fuentes de estudio</span><div className="source-list">{[...(selected.fuenteAA ?? []),...(selected.fuenteFGDLL ?? [])].map((s,i)=><p key={i}><strong>{s.obra}</strong>{s.referencia || s.seccion ? ` · ${s.referencia ?? s.seccion}` : ""}{s.uso ? ` — ${s.uso}` : ""}</p>)}{selected.fuenteLibre && <p>{selected.fuenteLibre}</p>}{!(selected.fuenteAA?.length || selected.fuenteFGDLL?.length || selected.fuenteLibre) && <p>Revisar la literatura y materiales institucionales relacionados antes de preparar el testimonio.</p>}</div></section>
    </div></div></div>}
  </main><SubFooter /></>;
}
