import Link from "next/link";
import { SubFooter, SubHeader } from "../../section-shell";

const modules = [
  ["M1", "El liderazgo comienza contigo", "https://www.youtube.com/watch?v=fo25kF4ubQc"],
  ["M2", "Comunicación Asertiva I", "https://www.youtube.com/watch?v=9IjvaLmG-a4"],
  ["M3", "Comunicación Asertiva II", "https://www.youtube.com/watch?v=I5CIVyMITZ8"],
  ["M4", "Inteligencia Emocional I", "https://www.youtube.com/watch?v=tSSD7kId0OU"],
  ["M5", "Inteligencia Emocional II", "https://www.youtube.com/watch?v=8vdm1dTqmWg"],
  ["M6", "Inteligencia Social I", "https://www.youtube.com/watch?v=t08dwWwa7uU"],
  ["M7", "Inteligencia Social II", "https://www.youtube.com/watch?v=QU1lI5sGMCk"],
  ["M8", "Oratoria", "https://www.youtube.com/watch?v=xvdvhEl5vwg"],
  ["M9", "Apadrinamiento I", "https://www.youtube.com/watch?v=CwU_YxPBJm8"],
  ["M10", "Apadrinamiento II", "https://www.youtube.com/watch?v=qYpoHNnOpac"],
  ["M11", "Coordinación", "https://www.youtube.com/watch?v=NBIVWtSx1S0"],
  ["M12", "Historia y filosofía FGDLL", "https://youtu.be/Q8Bot_dV2mo"],
  ["M13", "ADN FGDLL", "https://www.youtube.com/watch?v=vmZpoi3dbOk"],
];

const steps = [
  ["01", "Observa", "Mira y escucha con atención el módulo completo antes de comenzar a escribir."],
  ["02", "Reflexiona", "Identifica las ideas centrales, qué comprendiste y cómo se relacionan entre sí."],
  ["03", "Redacta", "Escribe tu resumen a mano y con tus propias palabras: dos hojas por ambos lados."],
  ["04", "Revisa", "Confirma que todas las hojas estén identificadas, legibles y en el orden correcto."],
  ["05", "Fotografía", "Toma imágenes claras, completas, con buena iluminación y sin cortar los bordes."],
  ["06", "Envía", "Comparte las fotografías en orden para que tu trabajo pueda revisarse correctamente."],
];

export default function DplPage(){
  return <><SubHeader label="Diplomado en Liderazgo I"/><main className="dpl-page">
    <section className="dpl-hero"><div className="shell"><span className="eyebrow light">Guía de actividades · DPL1 2022</span><h1>Comprender.<br/><em>Reflexionar.</em><br/>Expresar.</h1><p>El objetivo no es llenar hojas. Es demostrar que comprendiste cada módulo y que puedes explicar lo aprendido con tus propias palabras.</p><div className="hero-actions"><a className="button button-gold" href="#modulos">Comenzar el diplomado →</a><a className="button button-ghost" href="#instrucciones">Ver instrucciones</a></div></div></section>
    <section className="dpl-summary"><div className="shell"><article><strong>4</strong><span>cuartillas por módulo</span></article><article><strong>2</strong><span>hojas escritas por ambos lados</span></article><article><strong>13</strong><span>módulos del diplomado</span></article></div></section>
    <section className="section" id="instrucciones"><div className="shell dpl-instructions"><div><span className="eyebrow">La actividad</span><h2>¿Qué debes entregar?</h2><p>Un resumen personal de cada módulo, escrito a mano. Explica las ideas principales, lo que comprendiste y el aprendizaje que te deja el tema.</p><div className="dpl-warning"><strong>No copies textualmente.</strong><span>Escucha, comprende y después redacta con tu propio lenguaje.</span></div></div><div className="steps-list">{steps.map(([n,t,d])=><article key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></article>)}</div></div></section>
    <section className="section identify-section"><div className="shell"><div className="section-heading"><span className="eyebrow">Identificación</span><h2>Encabeza cada hoja correctamente.</h2><p>En la parte superior escribe siempre el módulo, tu nombre completo y el número de hoja.</p></div><div className="sheet-example"><span>EJEMPLO</span><strong>M1 — Juan Pérez — Hoja 1 de 2</strong><small>Repite el encabezado en cada hoja.</small></div><div className="check-grid"><span>✓ Vi y escuché el módulo completo</span><span>✓ Escribí cuatro cuartillas</span><span>✓ Usé mis propias palabras</span><span>✓ Identifiqué cada hoja</span><span>✓ Revisé que mi letra sea legible</span><span>✓ Tomé fotografías claras y en orden</span></div></div></section>
    <section className="section modules-section" id="modulos"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Videos del diplomado</span><h2>Avanza módulo por módulo.</h2></div><p>Observa cada video completo antes de realizar su resumen. Los enlaces se abren directamente en YouTube.</p></div><div className="module-list">{modules.map(([code,title,url],i)=><a key={code} href={url} target="_blank" rel="noreferrer"><span>{code}</span><div><small>MÓDULO {String(i+1).padStart(2,"0")}</small><h3>{title}</h3></div><b>Ver video ↗</b></a>)}</div></div></section>
    <section className="task-submit"><div className="shell"><span className="eyebrow light">Actividad terminada</span><h2>Envía las fotografías<br/>de tu tarea.</h2><p>Antes de enviarlas, confirma que estén claras, completas, identificadas y acomodadas en el orden correcto.</p><a className="button button-gold" href="https://wa.me/19999011852" target="_blank" rel="noreferrer">Enviar mi tarea por WhatsApp →</a><Link href="/universidad">Volver a Universidad FGDLL</Link></div></section>
  </main><SubFooter/></>;
}
