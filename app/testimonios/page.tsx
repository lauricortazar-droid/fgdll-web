"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import rawData from "../testimonios-data.json";
import { SubFooter, SubHeader } from "../section-shell";

type Source = { obra?: string; referencia?: string; seccion?: string; uso?: string };
type Tema = {
  id: string; titulo: string; tituloCorto?: string; estado?: string; sensibilidad?: string;
  categoria?: string; intensidad?: string; momento?: string; tipoTestimonio?: string;
  emocion?: string; pasos?: string[]; objetivo?: string; fraseAncla?: string;
  desarrollo?: string; fuenteLibre?: string; palabrasClave?: string[]; etiquetas?: string[];
  guiaTestimonio?: { detectar?: string[]; admitir?: string[]; corregir?: string[] };
  advertenciaEtica?: string; advertenciaLider?: string; noUsarPara?: string[];
  fuenteAA?: Source[]; fuenteFGDLL?: Source[];
  fileUrl?: string | null; fileName?: string; status?: string;
};

const fallbackTemas = rawData as unknown as Tema[];

function normalize(value: string) {
  return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function QuestionBlock({ n, title, subtitle, items }: { n: string; title: string; subtitle: string; items?: string[] }) {
  return <article className="question-block"><span>{n}</span><div><small>{subtitle}</small><h4>{title}</h4>{items?.length ? <ul>{items.map((q) => <li key={q}>{q}</li>)}</ul> : <p>Construye esta parte desde tu experiencia personal, sin teorizar ni aconsejar.</p>}</div></article>;
}

function formatTopic(topic: Tema) {
  return [topic.titulo, "", `Objetivo: ${topic.objetivo ?? ""}`, `Frase ancla: ${topic.fraseAncla ?? ""}`, `Categoría: ${topic.categoria ?? ""}`, `Pasos: ${(topic.pasos ?? []).join(", ")}`, "", "DETECTAR", ...(topic.guiaTestimonio?.detectar ?? []).map((item) => `• ${item}`), "", "ADMITIR", ...(topic.guiaTestimonio?.admitir ?? []).map((item) => `• ${item}`), "", "CORREGIR", ...(topic.guiaTestimonio?.corregir ?? []).map((item) => `• ${item}`), "", topic.advertenciaEtica ?? topic.advertenciaLider ?? ""].join("\n");
}

export default function TestimoniosPage() {
  const [temas, setTemas] = useState<Tema[]>(fallbackTemas);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [intensity, setIntensity] = useState("Todas");
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<Tema | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/content/testimonies", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active && Array.isArray(data.topics)) setTemas(data.topics); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["Todas", ...Array.from(new Set(temas.map((t) => t.categoria).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "es"))], [temas]);
  const intensities = useMemo(() => ["Todas", ...Array.from(new Set(temas.map((t) => t.intensidad).filter(Boolean) as string[]))], [temas]);
  const filtered = useMemo(() => temas.filter((t) => {
    const text = normalize([t.titulo, t.tituloCorto, t.categoria, t.objetivo, t.fraseAncla, ...(t.palabrasClave ?? []), ...(t.etiquetas ?? []), ...(t.pasos ?? [])].filter(Boolean).join(" "));
    return (category === "Todas" || t.categoria === category) && (intensity === "Todas" || t.intensidad === intensity) && text.includes(normalize(query.trim()));
  }), [temas, query, category, intensity]);

  function resetLimit() { setLimit(24); }
  function openTopic(topic: Tema) { setSelected(topic); setCopied(false); }
  async function copyTopic() {
    if (!selected) return;
    await navigator.clipboard.writeText(formatTopic(selected));
    setCopied(true);
  }

  return <><SubHeader label="Biblioteca de Testimonios" /><main className="testimony-page testimony-page-redesign">
    <section className="testimony-hero testimony-hero-editorial"><div className="shell testimony-hero-grid"><div><span className="eyebrow light">Catálogo institucional · FGDLL</span><h1>Temas para detectar,<br /><em>admitir y corregir.</em></h1><p>Una biblioteca para preparar testimonios desde la experiencia propia, con orden, responsabilidad y esperanza. No es un guion para actuar: es una guía para hablar con verdad.</p><div className="hero-actions"><a className="button button-gold" href="#biblioteca">Buscar un tema →</a><button className="button button-ghost" onClick={() => window.print()}>Imprimir selección</button></div></div><aside className="testimony-stats" aria-label="Resumen del catálogo"><div><strong>{temas.length}</strong><span>temas</span></div><div><strong>{categories.length - 1}</strong><span>categorías</span></div><div><strong>3</strong><span>tiempos</span></div></aside></div></section>

    <section className="testimony-principle-strip"><div className="shell"><span>01 · Detectar</span><span>02 · Admitir</span><span>03 · Corregir</span><p>Verdad + responsabilidad + esperanza</p></div></section>

    <section className="section testimony-library" id="biblioteca"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Biblioteca</span><h2>Encuentra el tema adecuado.</h2></div><p>Busca por tema, emoción, paso o palabra clave. Después filtra por categoría e intensidad.</p></div>
      <div className="testimony-tools"><label className="search-field"><span>⌕</span><input type="search" value={query} onChange={(e) => { setQuery(e.target.value); resetLimit(); }} placeholder="Presencia, perdón, fe, ansiedad…" /></label><select value={category} onChange={(e) => { setCategory(e.target.value); resetLimit(); }} aria-label="Categoría">{categories.map((c) => <option key={c}>{c}</option>)}</select><select value={intensity} onChange={(e) => { setIntensity(e.target.value); resetLimit(); }} aria-label="Intensidad">{intensities.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="results-head testimony-results-head"><p><strong>{filtered.length}</strong> resultado{filtered.length === 1 ? "" : "s"}</p><div className="filter-chips">{query && <span>“{query}”</span>}{category !== "Todas" && <span>{category}</span>}{intensity !== "Todas" && <span>Intensidad {intensity}</span>}</div></div>
      <div className="testimony-grid">{filtered.slice(0, limit).map((t, i) => <button className="testimony-card" key={`${t.id}-${i}`} onClick={() => openTopic(t)}><div className="testimony-card-top"><span>{t.categoria ?? "Tema"}</span><small>{t.intensidad ?? "Media"} · {t.momento ?? "Mitad"}</small></div><h3>{t.titulo}</h3><p>{t.objetivo || t.fraseAncla || "Una experiencia que puede transmitir aprendizaje y esperanza."}</p><div className="testimony-tags">{(t.etiquetas ?? t.palabrasClave ?? t.pasos ?? []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div><strong>Abrir ficha <b>→</b></strong></button>)}</div>
      {!filtered.length && <div className="empty-state"><strong>No encontramos temas con esos filtros.</strong><span>Prueba con otra palabra, categoría o intensidad.</span></div>}
      {limit < filtered.length && <div className="center-action"><button className="button testimony-more" onClick={() => setLimit(limit + 24)}>Mostrar más temas</button></div>}
    </div></section>

    <section className="testimony-guidance"><div className="shell testimony-guidance-grid"><div><span className="eyebrow light">Uso responsable</span><h2>Cuidar el testimonio también es cuidar a la comunidad.</h2></div><p>Habla desde tu propia experiencia. Evita convertir el compartimiento en juicio, consejo, exposición de terceros o catarsis sin orden. La ficha ayuda a preparar; nunca sustituye la conciencia ni el acompañamiento del líder.</p></div></section>

    <section className="section testimony-related"><div className="shell"><div className="section-heading"><span className="eyebrow">Continúa tu ruta</span><h2>Recursos relacionados.</h2></div><div className="testimony-related-grid"><Link href="/lider"><span>01</span><h3>Portal del Líder</h3><p>Protocolos, formatos y responsabilidades.</p><b>Ir al portal →</b></Link><Link href="/formacion"><span>02</span><h3>Formación FGDLL</h3><p>Diplomados y formación institucional.</p><b>Ver programas →</b></Link><Link href="/etica"><span>03</span><h3>Ética e Integridad</h3><p>Orientación, límites y cuidado responsable.</p><b>Consultar →</b></Link></div></div></section>

    {selected && <div className="testimony-modal" role="dialog" aria-modal="true" aria-labelledby="tema-title" onClick={() => setSelected(null)}><div className="testimony-sheet" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button><div className="sheet-head"><span>{selected.categoria ?? "Tema"} · {selected.intensidad ?? "Media"}</span><h2 id="tema-title">{selected.titulo}</h2><p>“{selected.fraseAncla || selected.tituloCorto || "Hablar con verdad para transmitir esperanza."}”</p><div>{(selected.pasos ?? []).slice(0, 6).map((item) => <small key={item}>{item}</small>)}</div></div><div className="sheet-body">
      <section><span className="sheet-label">Objetivo del testimonio</span><p>{selected.objetivo}</p>{selected.desarrollo && <blockquote>{selected.desarrollo}</blockquote>}</section>
      <section><span className="sheet-label">Guía de los tres tiempos</span><div className="question-grid"><QuestionBlock n="01" title="Detectar" subtitle="Lo que necesito mirar" items={selected.guiaTestimonio?.detectar} /><QuestionBlock n="02" title="Admitir" subtitle="Mi parte y mi verdad" items={selected.guiaTestimonio?.admitir} /><QuestionBlock n="03" title="Corregir" subtitle="Lo que practico hoy" items={selected.guiaTestimonio?.corregir} /></div></section>
      {(selected.advertenciaEtica || selected.advertenciaLider || selected.noUsarPara?.length) && <section className="ethics-note"><span className="sheet-label">Manejo responsable para el líder</span>{selected.advertenciaEtica && <p><strong>Advertencia ética:</strong> {selected.advertenciaEtica}</p>}{selected.advertenciaLider && <p><strong>Nota para el líder:</strong> {selected.advertenciaLider}</p>}{selected.noUsarPara?.length ? <p><strong>No usar para:</strong> {selected.noUsarPara.join(" · ")}</p> : null}</section>}
      <section><span className="sheet-label">Fuentes de estudio</span><div className="source-list">{[...(selected.fuenteAA ?? []), ...(selected.fuenteFGDLL ?? [])].map((s, i) => <p key={i}><strong>{s.obra}</strong>{s.referencia || s.seccion ? ` · ${s.referencia ?? s.seccion}` : ""}{s.uso ? ` — ${s.uso}` : ""}</p>)}{selected.fuenteLibre && <p>{selected.fuenteLibre}</p>}{!(selected.fuenteAA?.length || selected.fuenteFGDLL?.length || selected.fuenteLibre) && <p>Revisar la literatura y los materiales institucionales relacionados antes de preparar el testimonio.</p>}</div></section>
      <div className="sheet-actions">{selected.fileUrl && <a className="button button-gold" href={selected.fileUrl} target="_blank" rel="noreferrer">Abrir archivo{selected.fileName ? ` · ${selected.fileName}` : ""}</a>}<button className="button button-gold" onClick={copyTopic}>{copied ? "Ficha copiada ✓" : "Copiar ficha"}</button><a className="button button-outline" href={`https://wa.me/?text=${encodeURIComponent(formatTopic(selected))}`} target="_blank" rel="noreferrer">Compartir por WhatsApp</a><button className="button button-outline" onClick={() => window.print()}>Imprimir</button></div>
    </div></div></div>}
  </main><SubFooter /></>;
}
