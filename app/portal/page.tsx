"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../section-shell";

type Material = {
  id: string; title: string; category: string; description: string; versionLabel: string;
  fileName: string; fileUrl: string | null; previewUrl: string | null;
};
type Announcement = {
  id: string; title: string; summary: string; body: string; priority: string; publishedAt: string | null;
};

const tools = [
  { n: "01", title: "Gestión del directorio", text: "Actualiza los datos de tu grupo o revisa solicitudes según tu función.", tag: "Panel", href: "/directorio/gestion" },
  { n: "02", title: "Materiales para líderes", text: "Responsivas, formatos y documentos listos para consultar o imprimir.", tag: "Operación", href: "#materiales" },
  { n: "03", title: "Universidad FGDLL", text: "Diplomados y materiales separados por generación.", tag: "Formación", href: "/universidad" },
  { n: "04", title: "Biblioteca de Testimonios", text: "Temas con fuentes y preguntas para ordenar la experiencia.", tag: "Recursos", href: "/testimonios" },
  { n: "05", title: "Red nacional", text: "Directorio, zonas, responsables y coordinación.", tag: "Comunidad", href: "/#directorio" },
  { n: "06", title: "Ética e Integridad", text: "Orientación, límites y canal de reporte responsable.", tag: "Cuidado", href: "/etica" },
];

const initialMaterials: Material[] = [
  { id: "1", title: "Protocolo de Sesión Diaria", category: "protocolos", description: "Guía para abrir, conducir y cerrar la sesión.", versionLabel: "PDF · 3 páginas · A4", fileName: "protocolo-sesion-diaria.pdf", fileUrl: "/materiales/protocolo-sesion-diaria.pdf", previewUrl: "/materiales/protocolo-sesion-diaria.png" },
  { id: "2", title: "Protocolo de Aniversarios", category: "protocolos", description: "Orden operativo para las sesiones de aniversario.", versionLabel: "PDF · 3 páginas · A4", fileName: "protocolo-aniversarios.pdf", fileUrl: "/materiales/protocolo-aniversarios.pdf", previewUrl: "/materiales/protocolo-aniversarios.png" },
  { id: "3", title: "Hoja Responsiva FGDLL 2026", category: "responsivas", description: "Consentimiento informado completo para la Experiencia de Hacienda.", versionLabel: "PDF · 2 páginas · Carta", fileName: "hoja-responsiva-fgdll-2026-completa.pdf", fileUrl: "/materiales/hoja-responsiva-fgdll-2026-completa.pdf", previewUrl: "/materiales/responsiva-completa-2026.png" },
  { id: "4", title: "Hoja Responsiva FGDLL 2026 · Compacta", category: "responsivas", description: "Formato resumido para impresión rápida.", versionLabel: "PDF · 2 páginas · Carta", fileName: "hoja-responsiva-fgdll-2026-compacta.pdf", fileUrl: "/materiales/hoja-responsiva-fgdll-2026-compacta.pdf", previewUrl: "/materiales/responsiva-compacta-2026.png" },
];

const categoryMeta: Record<string, { title: string; text: string }> = {
  protocolos: { title: "Protocolos de sesión", text: "Guías de lectura y coordinación para mantener orden, tiempos y unidad." },
  responsivas: { title: "Responsivas y consentimiento", text: "Formatos para informar, documentar y resguardar la participación responsable." },
  reglamentos: { title: "Reglamentos", text: "Criterios institucionales para grupos, Hacienda y liderazgo." },
  formatos: { title: "Formatos de seguimiento", text: "Herramientas para registrar acuerdos, incidencias y responsabilidades." },
  experiencias: { title: "Materiales de experiencias", text: "Documentos para preparar, coordinar y cerrar cada experiencia." },
  otros: { title: "Otros materiales", text: "Recursos complementarios para el servicio." },
};

function friendlyDate(value: string | null) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export default function PortalPage() {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/content/materials", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/api/announcements", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/api/portal/me", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([materialData, announcementData, me]) => {
      if (!active) return;
      if (Array.isArray(materialData.materials)) setMaterials(materialData.materials);
      if (Array.isArray(announcementData.announcements)) setAnnouncements(announcementData.announcements);
      setIsAdmin(me.profile?.role === "admin");
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const materialGroups = useMemo(() => {
    const categories = Array.from(new Set(materials.map((item) => item.category)));
    const order = ["protocolos", "responsivas", "reglamentos", "formatos", "experiencias", "otros"];
    return categories.sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((category) => ({
      category,
      materials: materials.filter((item) => item.category === category),
    }));
  }, [materials]);

  return <><SubHeader label="Portal interno" /><main className="subpage">
    <section className="subhero portal-subhero"><div className="shell subhero-grid"><div><span className="eyebrow light">Tablero de liderazgo</span><h1>Servir con orden.<br /><em>Actuar con claridad.</em></h1><p>Una ruta institucional para consultar lo esencial, preparar el servicio y encontrar el recurso correcto sin perderse entre mensajes.</p>{isAdmin && <Link className="button button-gold" href="/administracion/contenidos">Administrar contenidos →</Link>}</div><div className="quick-panel"><span>ACCESO RÁPIDO</span><Link href="/directorio/gestion"><b>Gestionar directorio</b><i>→</i></Link><a href="#materiales"><b>Materiales para líderes</b><i>↓</i></a><Link href="/universidad"><b>Universidad FGDLL</b><i>→</i></Link><Link href="/#calendario"><b>Calendario 2026</b><i>→</i></Link><Link href="/etica"><b>Ética e Integridad</b><i>→</i></Link></div></div></section>

    {announcements.length > 0 && <section className="portal-announcements"><div className="shell"><div className="portal-announcement-head"><div><span className="eyebrow">Noticias y avisos</span><h2>Información que acompaña tu servicio.</h2></div><p>Los comunicados urgentes e importantes también aparecen en la campana superior hasta que los marques como leídos.</p></div><div className="portal-announcement-grid">{announcements.slice(0, 3).map((item) => <article key={item.id} className={`priority-${item.priority}`}><div><span>{item.priority === "urgent" ? "URGENTE" : item.priority === "important" ? "IMPORTANTE" : "AVISO"}</span><small>{friendlyDate(item.publishedAt)}</small></div><h3>{item.title}</h3><p>{item.summary || item.body}</p>{(item.summary || item.body.length > 180) && <details><summary>Leer aviso completo</summary><p>{item.body}</p></details>}</article>)}</div></div></section>}

    <section className="section portal-tools"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Ruta de servicio</span><h2>Lo que cada líder necesita.</h2></div><p>El portal está organizado por intención de uso: saber qué hacer, encontrar cómo hacerlo y dar seguimiento con responsabilidad.</p></div><div className="tool-catalog">{tools.map((tool) => <article key={tool.n}><span>{tool.n}</span><small>{tool.tag}</small><h3>{tool.title}</h3><p>{tool.text}</p><Link href={tool.href}>Abrir sección →</Link></article>)}</div></div></section>

    <section className="section leader-materials" id="materiales"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Materiales para líderes</span><h2>Documentos para conducir y cuidar.</h2></div><p>Consulta siempre la versión publicada antes de utilizar un protocolo, formato o reglamento.</p></div>
      {materialGroups.map((group, index) => <div className="dynamic-material-group" key={group.category}><div className="material-group-heading"><div><span>{String(index + 1).padStart(2, "0")}</span><h3>{categoryMeta[group.category]?.title || group.category}</h3></div><p>{categoryMeta[group.category]?.text || "Materiales institucionales para el servicio."}</p></div><div className="material-grid">{group.materials.map((item) => <article className="material-card" key={item.id}><div className={`material-preview ${item.previewUrl ? "" : "generic-file"}`}>{item.previewUrl ? <img src={item.previewUrl} alt={`Vista previa de ${item.title}`} /> : <div><span>{item.fileName.split(".").pop()?.toUpperCase() || "DOC"}</span><small>FGDLL</small></div>}</div><div className="material-content"><div className="material-meta"><span>{categoryMeta[item.category]?.title || item.category}</span><small>{item.versionLabel || item.fileName}</small></div><h3>{item.title}</h3><p>{item.description || "Documento institucional para consulta de líderes."}</p><div className="material-actions">{item.fileUrl && <a className="button button-gold" href={item.fileUrl} target="_blank" rel="noreferrer">Abrir documento</a>}</div></div></article>)}</div></div>)}
      {!materials.length && <div className="empty-panel"><span>◎</span><p>La biblioteca todavía no tiene materiales publicados.</p></div>}
      <div className="material-note"><strong>Uso interno FGDLL</strong><span>Antes de cada actividad, confirma que utilizas la versión vigente. Los documentos con datos personales deben resguardarse con confidencialidad.</span></div>
    </div></section>

    <section className="section operating"><div className="shell operating-grid"><div><span className="eyebrow light">Centro de Operaciones</span><h2>Una base firme para no improvisar.</h2><p>La operación se agrupa por tipo de necesidad. Así cada responsable puede ubicar protocolos y documentos en el momento correcto.</p></div><div className="operating-list"><article><span>PROTOCOLOS</span><h3>Sesión diaria · Aniversarios · Experiencias</h3><p>Apertura, roles, seguridad, bitácora y cierre responsable.</p></article><article><span>RESPONSIVAS</span><h3>Adultos · Menores · Apoyos</h3><p>Consentimiento, contactos de emergencia y asignación responsable.</p></article><article><span>REGLAMENTOS</span><h3>Grupo · Hacienda · Liderazgo</h3><p>Disciplina, respeto, límites y uso adecuado de los espacios.</p></article></div></div></section>
  </main><SubFooter /></>;
}
