"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { SubFooter, SubHeader } from "../section-shell";

type Category = {
  id: string;
  roman: string;
  title: string;
  summary: string;
  reportable: string[];
  redFlags: string[];
  impact: string;
};

const categories: Category[] = [
  {
    id: "autoridad", roman: "I", title: "Abuso de autoridad y ética del liderazgo",
    summary: "El liderazgo es una función administrativa de servicio. No autoriza controlar la vida personal, sustituir atención profesional ni obtener beneficios económicos, emocionales o sexuales.",
    reportable: ["Gritos, apodos ofensivos, humillaciones o amenazas", "Imponer criterios personales como si fueran norma institucional", "Meditaciones, dinámicas o prácticas dirigidas no autorizadas", "Represalias, favoritismo o asignación arbitraria de servicios"],
    redFlags: ["“Si no haces lo que digo, recaerás”", "Te piden obediencia personal por encima del reglamento", "Un servidor se presenta como terapeuta, juez o autoridad espiritual"],
    impact: "Produce dependencia, miedo, indefensión y pérdida de confianza en el proceso de recuperación.",
  },
  {
    id: "integridad", roman: "II", title: "Protección de la integridad física y psicológica",
    summary: "Toda persona merece un trato digno y seguro. La prevención, atención y canalización deben respetar los límites aplicables y nunca normalizar la violencia.",
    reportable: ["Golpes, sujeciones, castigos o restricciones desproporcionadas", "Humillación sistemática, aislamiento o intimidación", "Medicamentos suministrados sin control profesional", "Fotografías, audio o video sin consentimiento correspondiente"],
    redFlags: ["Lesiones sin explicación clara", "Temor extremo ante líderes o guías", "Se impide pedir ayuda médica, familiar o institucional"],
    impact: "Puede agravar el trauma, provocar abandono del proceso y convertir un espacio de ayuda en una fuente de daño.",
  },
  {
    id: "finanzas", roman: "III", title: "Integridad financiera y desvío de recursos",
    summary: "La Séptima y los recursos de cada grupo deben manejarse con testigos, registros verificables y rendición de cuentas.",
    reportable: ["Uso de dinero o bienes para fines personales", "Tesorero con menos de dos años de militancia", "Conteos sin testigos o comprobantes incompletos", "Alteración de registros, uso de tinta incorrecta u opacidad en ingresos y egresos"],
    redFlags: ["Te piden depositar a cuentas personales sin explicación", "Se niega acceso a cortes o comprobantes", "Los saldos cambian sin acuerdos documentados"],
    impact: "Erosiona la confianza, debilita la autonomía del grupo y rompe la congruencia del servicio.",
  },
  {
    id: "anonimato", roman: "IV", title: "Ruptura del principio de anonimato",
    summary: "Lo compartido en tribuna, preparación, apadrinamiento y procesos personales debe resguardarse con especial cuidado.",
    reportable: ["Difundir testimonios, diagnósticos o historias personales", "Compartir capturas, fotografías o audios sin autorización", "Usar información privada para presionar, ridiculizar o excluir", "Revelar la identidad de quien pidió orientación o reportó hechos"],
    redFlags: ["“Aquí todos nos contamos todo”", "Te amenazan con publicar lo que compartiste", "Circulan detalles íntimos fuera del espacio correspondiente"],
    impact: "Genera fuga emocional, desconfianza sistémica y abandono por miedo a una nueva exposición.",
  },
  {
    id: "limites", roman: "V", title: "Conductas sexuales inapropiadas y límites",
    summary: "La vulnerabilidad nunca debe aprovecharse para insinuaciones, relaciones, contacto físico no consentido o intercambios condicionados por una posición de servicio.",
    reportable: ["Comentarios sexuales, insinuaciones o contacto físico no consentido", "Citas en casas, hoteles u otros lugares privados", "Apadrinamiento cruzado entre personas de distinto sexo", "Favores, beneficios o amenazas condicionados a una relación"],
    redFlags: ["Piden mantener encuentros o mensajes en secreto", "Se usa la recuperación como argumento para acercamientos íntimos", "Hay diferencia de poder y presión para aceptar"],
    impact: "Revictimiza, rompe límites terapéuticos y puede producir daño emocional, físico y legal.",
  },
];

const sanctions = [
  ["01", "Llamada de atención verbal", "Intervención inicial ante faltas menores, con claridad sobre la conducta esperada."],
  ["02", "Amonestación registrada", "Documento formal para dejar constancia, acuerdos y medidas correctivas."],
  ["03", "Suspensión temporal del servicio", "Pausa de privilegios de servicio para priorizar recuperación y revisión responsable."],
  ["04", "Canalización a padrino o delegado", "Mediación administrativa cuando la estructura local no puede resolver el conflicto."],
  ["05", "Expulsión", "Último recurso ante faltas críticas, con revisión institucional y derecho de audiencia."],
];

const principles = ["Amor", "Comprensión", "Tolerancia", "Respeto", "Responsabilidad"];

export default function EthicsPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [receipt, setReceipt] = useState<{ publicFolio: string; trackingKey: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [tracking, setTracking] = useState<{ report: Record<string, string>; events: Array<Record<string, string>> } | null>(null);
  const [trackingError, setTrackingError] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const selected = useMemo(() => categories.find((item) => item.id === activeCategory) || categories[0], [activeCategory]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setFormError("");
    setReceipt(null);
    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());
    body.consent = form.get("consent") === "on";
    try {
      const response = await fetch("/api/ethics/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string; publicFolio?: string; trackingKey?: string };
      if (!response.ok || !data.publicFolio || !data.trackingKey) throw new Error(data.error || "No fue posible registrar el reporte.");
      setReceipt({ publicFolio: data.publicFolio, trackingKey: data.trackingKey });
      formElement.reset();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No fue posible registrar el reporte.");
    } finally {
      setSending(false);
    }
  }

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTrackingLoading(true);
    setTrackingError("");
    setTracking(null);
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/ethics/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string; report?: Record<string, string>; events?: Array<Record<string, string>> };
      if (!response.ok || !data.report) throw new Error(data.error || "No fue posible consultar el seguimiento.");
      setTracking({ report: data.report, events: data.events || [] });
    } catch (error) {
      setTrackingError(error instanceof Error ? error.message : "No fue posible consultar el seguimiento.");
    } finally {
      setTrackingLoading(false);
    }
  }

  return <>
    <div className="emergency">Si existe riesgo inmediato para tu vida o integridad física, llama al <a href="tel:911">911</a>. Este portal no sustituye servicios de emergencia.</div>
    <SubHeader label="Ética e integridad" />
    <main className="subpage ethics-page ethics-spa-page">
      <section className="subhero ethics-spa-hero"><div className="shell ethics-spa-hero-grid"><div><span className="eyebrow light">Educación · Prevención · Justicia organizacional</span><h1>Reconocer un abuso<br /><em>también es prevenirlo.</em></h1><p>Una guía interactiva para identificar conductas reportables, comprender su impacto y conocer el proceso ético de FGDLL.</p><div className="hero-actions"><a className="button button-gold" href="#categorias">Explorar categorías ↓</a><a className="button button-ghost" href="#reporte">Preparar un reporte</a></div></div><aside><img src="/logo-gdll.png" alt="Escudo de Guerreros de la Luz" /><small>PUERTO SEGURO INSTITUCIONAL</small><strong>La autoridad existe para servir, nunca para manipular.</strong><div>{principles.map((item) => <span key={item}>{item}</span>)}</div></aside></div></section>

      <nav className="ethics-spa-index" aria-label="Contenido del portal"><div className="shell"><a href="#identidad"><b>01</b>Identidad</a><a href="#categorias"><b>02</b>Conductas</a><a href="#salvaguardas"><b>03</b>Salvaguardas</a><a href="#disciplina"><b>04</b>Disciplina</a><a href="#reporte"><b>05</b>Reporte</a></div></nav>

      <section className="section ethics-identity" id="identidad"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Identidad y valores</span><h2>El Mundo de los Iguales.</h2></div><p>El dolor no tiene jerarquías. Ningún cargo, antigüedad o servicio coloca a una persona por encima de la dignidad de otra.</p></div><div className="identity-grid"><article><span>EL ESCUDO</span><h3>Fe para avanzar</h3><p>El emblema recuerda una identidad de servicio: espada, escudo, siete diamantes, paloma y triángulo como símbolos de palabra, fe, virtudes, espíritu y legados.</p></article><article><span>LA REGLA DE ORO</span><h3>Voluntad para servir</h3><blockquote>Usar la voluntad para ayudar al prójimo a levantarse, nunca para controlarlo.</blockquote></article><article><span>EL LÍMITE</span><h3>Autoridad administrativa</h3><p>El líder facilita y organiza. No debe fungir como terapeuta, juez ni director espiritual, ni sustituir a profesionales.</p></article></div></div></section>

      <section className="section ethics-categories" id="categorias"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Catálogo normativo</span><h2>Cinco categorías para hablar claro.</h2></div><p>Selecciona una categoría para reconocer ejemplos, banderas rojas y el daño que estas conductas pueden provocar.</p></div><div className="category-workspace"><div className="category-tabs" role="tablist" aria-label="Categorías de faltas">{categories.map((item) => <button key={item.id} type="button" role="tab" aria-selected={activeCategory === item.id} className={activeCategory === item.id ? "active" : ""} onClick={() => setActiveCategory(item.id)}><b>{item.roman}</b><span>{item.title}</span></button>)}</div><article className="category-detail" role="tabpanel"><header><span>CATEGORÍA {selected.roman}</span><h3>{selected.title}</h3><p>{selected.summary}</p></header><div className="category-columns"><section><h4>Conductas reportables</h4><ul>{selected.reportable.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="red-flags"><h4>Banderas rojas</h4><ul>{selected.redFlags.map((item) => <li key={item}>{item}</li>)}</ul></section></div><footer><strong>Impacto en la recuperación</strong><p>{selected.impact}</p></footer></article></div></div></section>

      <section className="section ethics-safeguards" id="salvaguardas"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Riesgos y salvaguardas</span><h2>Primero la integridad de la persona.</h2></div><p>La prevención ética protege el proceso de recuperación y evita que una estructura de ayuda se convierta en una fuente adicional de daño.</p></div><div className="safeguard-grid"><article><b>01</b><h3>Dignidad humana</h3><p>Cero tolerancia a golpes, humillaciones, coerción, castigos y aprovechamiento de la vulnerabilidad.</p></article><article><b>02</b><h3>Confidencialidad</h3><p>Resguardo de testimonios, expedientes, imágenes y cualquier información sensible compartida durante el proceso.</p></article><article><b>03</b><h3>Transparencia</h3><p>Ingresos, egresos, decisiones y cambios de servicio documentados y revisables.</p></article><article><b>04</b><h3>Imparcialidad</h3><p>Declaración de intereses y separación de cualquier persona con vínculos que comprometan una revisión justa.</p></article></div><div className="normative-note"><div><span>MARCO DE REFERENCIA</span><a href="https://dof.gob.mx/nota_detalle_popup.php?codigo=5106313" target="_blank" rel="noopener noreferrer"><strong>NOM-028-SSA2-2009 ↗</strong></a><p>Prevención, tratamiento y control de las adicciones.</p></div><div><span>DATOS PERSONALES</span><a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf" target="_blank" rel="noopener noreferrer"><strong>LFPDPPP ↗</strong></a><p>Los datos sensibles requieren finalidades legítimas, aviso de privacidad y consentimiento aplicable.</p></div><small>La aplicación concreta debe revisarse con profesionales competentes y con los documentos institucionales vigentes.</small></div></div></section>

      <section className="section ethics-discipline" id="disciplina"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Justicia organizacional</span><h2>Disciplina gradual, no reacción impulsiva.</h2></div><p>El objetivo es proteger, corregir y reparar. La gravedad, reincidencia, evidencia y derecho de audiencia deben formar parte de cada decisión.</p></div><div className="sanction-timeline">{sanctions.map(([number, title, text]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div><div className="process-strip"><span>Recepción</span><i>→</i><span>Evaluación inicial</span><i>→</i><span>Investigación</span><i>→</i><span>Recomendación</span><i>→</i><span>Resolución y seguimiento</span></div></div></section>

      <section className="section ethics-report" id="reporte"><div className="shell report-layout"><div><span className="eyebrow">Canal confidencial</span><h2>Registra los hechos con claridad.</h2><p>El reporte se almacena en la base institucional y puede consultarse con un folio y una clave privada. El sistema no adjunta deliberadamente el correo de tu cuenta al expediente, pero no puede prometer anonimato técnico absoluto: la plataforma y la infraestructura de red pueden procesar datos de conexión.</p><div className="report-guidance"><article><b>1</b><span><strong>Qué ocurrió</strong>Hechos observables, sin rumores.</span></article><article><b>2</b><span><strong>Cuándo y dónde</strong>Fecha y ubicación aproximadas.</span></article><article><b>3</b><span><strong>Quiénes participaron</strong>Personas involucradas y testigos.</span></article><article><b>4</b><span><strong>Qué necesitas</strong>Protección, orientación o revisión.</span></article></div><div className="privacy-warning"><strong>Comparte solamente lo necesario.</strong><p>No cargues evidencias en este formulario. Conserva los archivos originales en un lugar seguro; si el comité los requiere, acordará contigo un medio de entrega.</p></div></div><form onSubmit={submit} className="report-form ethics-draft-form"><input name="website" tabIndex={-1} autoComplete="off" className="form-honeypot" aria-hidden="true" /><label>Categoría<select name="category" required defaultValue=""><option value="" disabled>Selecciona una categoría</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.roman}. {item.title}</option>)}</select></label><div className="report-form-row"><label>Zona o grupo<input name="groupZone" maxLength={180} placeholder="Ej. Zona Jaguar / Grupo…" /></label><label>Fecha aproximada<input name="approximateDate" type="date" /></label></div><label>Relato de los hechos<textarea name="narrative" required minLength={30} maxLength={10000} rows={7} placeholder="Describe qué ocurrió, cuándo, dónde y cómo. Evita rumores." /></label><label>Personas o testigos<textarea name="peopleOrWitnesses" maxLength={3000} rows={3} placeholder="Nombres, iniciales o roles, si corresponde" /></label><label>Apoyo que se necesita<select name="supportNeeded" defaultValue="Orientación"><option>Orientación</option><option>Protección inmediata</option><option>Revisión institucional</option><option>Mediación</option></select></label><label>¿Cómo podemos contactarte? (opcional)<select name="contactMethod" defaultValue="none"><option value="none">Prefiero no dejar contacto</option><option value="whatsapp">WhatsApp</option><option value="phone">Llamada</option><option value="email">Correo electrónico</option></select></label><label>Dato de contacto seguro<input name="safeContact" maxLength={254} placeholder="Déjalo vacío si elegiste no recibir contacto" /></label><label className="consent-check"><input name="consent" type="checkbox" required /><span>Confirmo que la información es de buena fe y autorizo su tratamiento para recibir, evaluar y dar seguimiento a este reporte.</span></label><button className="button button-gold" type="submit" disabled={sending}>{sending ? "Registrando…" : "Enviar reporte confidencial"}</button>{formError && <p className="form-error" role="alert">{formError}</p>}{receipt && <div className="folio"><span>Reporte recibido — guarda ambos datos ahora</span><strong>{receipt.publicFolio.replace(/(.{4})/g, "$1 ").trim()}</strong><code>{receipt.trackingKey}</code><small>La clave se muestra una sola vez y no podemos recuperarla. Necesitarás el folio y la clave para consultar avances.</small></div>}</form></div></section>

      <section className="section ethics-tracking" id="seguimiento"><div className="shell report-layout"><div><span className="eyebrow">Seguimiento privado</span><h2>Consulta el estado de tu reporte.</h2><p>Introduce exactamente el folio de 16 dígitos y la clave de 48 caracteres que recibiste. La consulta no muestra notas internas ni datos administrativos.</p></div><form className="report-form" onSubmit={track}><label>Folio<input name="publicFolio" required inputMode="numeric" placeholder="0000 0000 0000 0000" /></label><label>Clave privada<input name="trackingKey" required autoComplete="off" placeholder="48 caracteres" /></label><button className="button button-gold" disabled={trackingLoading}>{trackingLoading ? "Consultando…" : "Consultar seguimiento"}</button>{trackingError && <p className="form-error" role="alert">{trackingError}</p>}{tracking && <div className="tracking-result"><strong>Estado: {tracking.report.status}</strong><small>Folio {String(tracking.report.public_folio).replace(/(.{4})/g, "$1 ").trim()}</small>{tracking.events.map((item, index) => <article key={`${item.created_at}-${index}`}><b>{item.public_message}</b><time>{item.created_at}</time></article>)}</div>}</form></div></section>

      <section className="ethics-closing"><div className="shell"><span className="eyebrow light">Compromiso institucional</span><h2>La luz también se cuida con límites.</h2><p>Conocer las reglas, documentar con honestidad y actuar sin represalias fortalece el servicio y protege a quien todavía está aprendiendo a pedir ayuda.</p><div><Link className="button button-gold" href="/portal">Volver al Portal de Líderes →</Link><a className="button button-ghost" href="tel:911">Emergencia: llamar al 911</a></div></div></section>
    </main>
    <SubFooter />
  </>;
}
