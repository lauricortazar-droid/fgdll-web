import Link from "next/link";
import { SubFooter, SubHeader } from "../section-shell";

export default function OrientationPage() {
  return <><SubHeader label="Necesito orientación" /><main className="orientation-page">
    <section className="orientation-hero"><div className="shell"><span className="eyebrow light">No tienes que saber qué hacer para pedir ayuda</span><h1>Hoy no tienes que<br /><em>cargar todo a solas.</em></h1><p>Elige el camino que más se acerque a lo que estás viviendo. No necesitas dar explicaciones perfectas para comenzar.</p><a className="button button-gold" href="#caminos">Ver opciones</a></div></section>

    <section className="section orientation-paths" id="caminos"><div className="shell"><div className="section-heading"><span className="eyebrow">Tres caminos para empezar</span><h2>Da el paso que hoy sí puedes dar.</h2></div><div className="orientation-grid">
      <article id="para-mi"><span>01</span><h2>Busco ayuda para mí</h2><p>Puedes encontrar un grupo cercano, revisar sus horarios y escribir por WhatsApp antes de asistir. Basta con decir: “Quiero información para asistir por primera vez”.</p><Link className="button button-gold" href="/#directorio">Encontrar un grupo</Link></article>
      <article id="para-alguien"><span>02</span><h2>Busco ayuda para alguien que quiero</h2><p>No puedes recorrer el camino por otra persona, pero sí puedes acompañarla sin abandonarte. Acércate a un grupo para recibir orientación y conocer opciones de apoyo.</p><Link className="button button-outline" href="/#directorio">Consultar grupos</Link></article>
      <article id="hablar"><span>03</span><h2>Solo necesito hablar con alguien</h2><p>Elige el grupo más cercano y usa su contacto público. Si todavía no sabes cuál corresponde, empieza por tu ciudad: la persona que atienda puede orientarte.</p><Link className="button button-outline" href="/#directorio">Ver contactos</Link></article>
    </div></div></section>

    <section className="first-visit"><div className="shell first-visit-grid"><div><span className="eyebrow light">Para tu primera vez</span><h2>Puedes llegar como estás.</h2><p>No necesitas conocer el programa ni tener preparado un discurso. Pregunta por la persona responsable, explica que es tu primera visita y permite que te orienten.</p></div><ol><li><b>1</b><span>Busca un grupo por ciudad o zona.</span></li><li><b>2</b><span>Confirma por WhatsApp el horario y la dirección.</span></li><li><b>3</b><span>Acude con disposición de escuchar y pedir ayuda.</span></li></ol></div></section>

    <section className="section professional-boundary"><div className="shell boundary-card"><div><span>SI HAY RIESGO INMEDIATO</span><h2>Una emergencia necesita atención profesional ahora.</h2><p>FGDLL ofrece acompañamiento comunitario y de recuperación; no sustituye urgencias médicas, atención psicológica, psiquiátrica ni servicios de emergencia.</p></div><div className="emergency-actions"><a href="tel:911"><small>Emergencias en México</small><strong>911</strong></a><a href="tel:8009112000"><small>Línea de la Vida</small><strong>800 911 2000</strong><span>Salud mental y consumo de sustancias</span></a></div></div></section>
  </main><SubFooter /></>;
}
