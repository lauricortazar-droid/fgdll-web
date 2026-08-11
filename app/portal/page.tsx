import Link from "next/link";
import { SubFooter, SubHeader } from "../section-shell";

const tools = [
  { n: "01", title: "Mi servicio", text: "Responsabilidades, compromisos y prioridades del líder.", tag: "Punto de partida" },
  { n: "02", title: "Centro de operaciones", text: "Protocolos, formatos, responsivas y reglamentos.", tag: "Operación" },
  { n: "03", title: "Universidad FGDLL", text: "Diplomados y materiales separados por generación.", tag: "Formación", href: "/universidad" },
  { n: "04", title: "Biblioteca de la Luz", text: "Guías para coordinar, formar, orientar y cuidar.", tag: "Recursos" },
  { n: "05", title: "Red nacional", text: "Directorio, zonas, responsables y coordinación.", tag: "Comunidad", href: "/#directorio" },
  { n: "06", title: "Ética e Integridad", text: "Orientación, límites y canal de reporte responsable.", tag: "Cuidado", href: "/etica" },
];

export default function PortalPage() {
  return <><SubHeader label="Portal interno" /><main className="subpage">
    <section className="subhero portal-subhero"><div className="shell subhero-grid"><div><span className="eyebrow light">Tablero de liderazgo</span><h1>Servir con orden.<br /><em>Actuar con claridad.</em></h1><p>Una ruta institucional para consultar lo esencial, preparar el servicio y encontrar el recurso correcto sin perderse entre mensajes.</p></div><div className="quick-panel"><span>ACCESO RÁPIDO</span><Link href="/universidad"><b>Universidad FGDLL</b><i>→</i></Link><Link href="/#calendario"><b>Calendario 2026</b><i>→</i></Link><Link href="/centros"><b>Centros Teocalli</b><i>→</i></Link><Link href="/etica"><b>Ética e Integridad</b><i>→</i></Link></div></div></section>
    <section className="section portal-tools"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Ruta de servicio</span><h2>Lo que cada líder necesita.</h2></div><p>El portal está organizado por intención de uso: saber qué hacer, encontrar cómo hacerlo y dar seguimiento con responsabilidad.</p></div><div className="tool-catalog">{tools.map((tool) => <article key={tool.n}><span>{tool.n}</span><small>{tool.tag}</small><h3>{tool.title}</h3><p>{tool.text}</p>{tool.href ? <Link href={tool.href}>Abrir sección →</Link> : <button disabled>Próxima conexión</button>}</article>)}</div></div></section>
    <section className="section operating"><div className="shell operating-grid"><div><span className="eyebrow light">Centro de Operaciones</span><h2>Una base firme para no improvisar.</h2><p>La operación se agrupa por tipo de necesidad. Así cada responsable puede ubicar protocolos y documentos en el momento correcto.</p></div><div className="operating-list"><article><span>PROTOCOLOS</span><h3>Sesión diaria · Aniversarios · Experiencias</h3><p>Apertura, roles, seguridad, bitácora y cierre responsable.</p></article><article><span>RESPONSIVAS</span><h3>Adultos · Menores · Apoyos</h3><p>Consentimiento, contactos de emergencia y asignación responsable.</p></article><article><span>REGLAMENTOS</span><h3>Grupo · Hacienda · Liderazgo</h3><p>Disciplina, respeto, límites y uso adecuado de los espacios.</p></article></div></div></section>
    <section className="section next-step"><div className="shell"><div><span>PRÓXIMA ETAPA</span><h2>Conectar los documentos oficiales y el acceso autorizado.</h2></div><p>La estructura visual ya está preparada. Los materiales internos, credenciales y seguimiento seguro requieren la fuente institucional definitiva.</p></div></section>
  </main><SubFooter /></>;
}
