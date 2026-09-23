"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type TopicStatus = "not_started" | "in_progress" | "completed" | "sent";
type Video = { title: string; url: string; length: string };
type Topic = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  time: string;
  videos: Video[];
  sourceIdeas: string[];
  exercises: { id: string; label: string; help: string; example: string }[];
};
type Profile = { fullName: string; group: string; zone: string; email: string; phone: string; recognitionName: string };
type TopicProgress = { status: TopicStatus; reviewed: boolean; sentAt?: string; completedAt?: string; answers: Record<string, string> };
type WorkbookState = { profile: Profile; topics: Record<string, TopicProgress> };

const STORAGE_KEY = "fgdll-dpl1-2022-regularizacion-v1";
const contactPhone = "5219999011852";
const emptyProfile: Profile = { fullName: "", group: "", zone: "", email: "", phone: "", recognitionName: "" };

const topics: Topic[] = [
  {
    id: "liderazgo",
    number: "01",
    title: "Introduccion al Liderazgo",
    subtitle: "De pertenecer a un grupo a construir un equipo.",
    time: "Video 34 min + cuadernillo 20 min",
    videos: [{ title: "Introduccion al liderazgo", url: "https://www.youtube.com/watch?v=fo25kF4ubQc", length: "34 min" }],
    sourceIdeas: ["El liderazgo no es un titulo: es una actitud que se desarrolla.", "La mision del lider es convertir grupos en equipos con objetivo, metas y plan.", "FGDLL trabaja para informar, transmitir, contener y promover desarrollo humano.", "Guiar desde el amor requiere capacitacion, principios y bienestar comun."],
    exercises: [
      { id: "definition", label: "Para mi, liderar hoy significa:", help: "Escribe una frase sencilla, sin copiar la clase.", example: "Ejemplo: liderar es ayudar a que mi grupo camine con orden, amor y un objetivo claro." },
      { id: "team", label: "Que le falta a mi grupo para funcionar mas como equipo?", help: "Piensa en objetivo, metas, plan, comunicacion o seguimiento.", example: "Ejemplo: nos falta acordar una meta semanal y quien dara seguimiento." },
      { id: "love", label: "Una decision que puedo tomar desde amor y no desde miedo es:", help: "Elige una situacion real de tu servicio, familia o grupo.", example: "Ejemplo: hablar con calma con una persona antes de reganarla frente a otros." },
    ],
  },
  {
    id: "comunicacion",
    number: "02",
    title: "Comunicacion Asertiva",
    subtitle: "Escuchar, delegar y clarificar de manera consciente.",
    time: "2 videos + cuadernillo 25 min",
    videos: [
      { title: "Comunicacion Asertiva I", url: "https://www.youtube.com/watch?v=9IjvaLmG-a4", length: "Parte I" },
      { title: "Comunicacion Asertiva II", url: "https://www.youtube.com/watch?v=I5CIVyMITZ8", length: "Parte II" },
    ],
    sourceIdeas: ["Callados es como se aprende a escuchar; escuchando se aprende a hablar.", "La escucha activa usa atencion, observacion, preguntas y verificacion.", "Delegar no es abandonar: implica claridad, objetivo y seguimiento.", "La comunicacion asertiva ayuda a servir en familia, trabajo, hogar y grupos."],
    exercises: [
      { id: "listen", label: "Una conversacion donde necesito escuchar mejor es:", help: "Describe con quien y que necesitas escuchar antes de responder.", example: "Ejemplo: con un servidor nuevo; antes de corregirlo necesito preguntarle que entendio." },
      { id: "delegate", label: "Una tarea que puedo delegar con claridad es:", help: "Incluye que se hara, para cuando y como revisaras el avance.", example: "Ejemplo: pedir a dos companeros confirmar asistencia y revisar juntos el sabado." },
      { id: "clarify", label: "La frase asertiva que voy a practicar sera:", help: "Usa palabras claras, respetuosas y concretas.", example: "Ejemplo: necesito que lleguemos 15 minutos antes para iniciar a tiempo." },
    ],
  },
  {
    id: "emocional",
    number: "03",
    title: "Inteligencia Emocional",
    subtitle: "Reconocer, entender y trabajar las emociones propias y ajenas.",
    time: "2 videos + cuadernillo 25 min",
    videos: [
      { title: "Inteligencia Emocional I", url: "https://www.youtube.com/watch?v=tSSD7kId0OU", length: "Parte I" },
      { title: "Inteligencia Emocional II", url: "https://www.youtube.com/watch?v=8vdm1dTqmWg", length: "Parte II" },
    ],
    sourceIdeas: ["El modulo se apoya en la inteligencia emocional de Daniel Goleman.", "Busca identificar emociones y como afectan la vida diaria.", "Trabaja autoconocimiento, autorregulacion, motivacion, empatia y habilidades sociales.", "La inteligencia emocional sirve para relaciones interpersonales productivas y asertivas."],
    exercises: [
      { id: "emotion", label: "Una emocion que se repite en mi servicio es:", help: "Nombra la emocion y en que momento aparece.", example: "Ejemplo: ansiedad cuando tengo que hablar con alguien molesto." },
      { id: "body", label: "La noto en mi cuerpo asi:", help: "Escribe senales simples: presion, calor, cansancio, silencio, impulso.", example: "Ejemplo: aprieto la mandibula y quiero contestar rapido." },
      { id: "regulation", label: "Antes de actuar, voy a regularme haciendo:", help: "Elige una accion breve y realista.", example: "Ejemplo: respirar, pedir dos minutos y regresar con una respuesta mas clara." },
    ],
  },
  {
    id: "social",
    number: "04",
    title: "Inteligencia Social",
    subtitle: "Relacionarme mejor para liderar mejor.",
    time: "2 videos + cuadernillo 25 min",
    videos: [
      { title: "Inteligencia Social I", url: "https://www.youtube.com/watch?v=t08dwWwa7uU", length: "Parte I" },
      { title: "Inteligencia Social II", url: "https://www.youtube.com/watch?v=QU1lI5sGMCk", length: "Parte II" },
    ],
    sourceIdeas: ["La inteligencia social complementa comunicacion asertiva e inteligencia emocional.", "Antes de liderar a otros, hay que liderarnos a nosotros mismos.", "El pasado influye en decisiones, sentimientos y actitudes si no lo trabajamos.", "El liderazgo necesita apertura mental para reconocer que todos caben."],
    exercises: [
      { id: "judgment", label: "Un juicio que necesito revisar sobre otra persona es:", help: "No escribas nombres completos si no hace falta.", example: "Ejemplo: pienso que no quiere servir, pero quiza no sabe como pedir ayuda." },
      { id: "relation", label: "Para relacionarme mejor con esa persona, puedo:", help: "Elige una accion observable.", example: "Ejemplo: preguntarle que necesita para cumplir su servicio." },
      { id: "selflead", label: "Antes de liderar a otros, necesito liderarme en:", help: "Piensa en puntualidad, tono, orden, paciencia, seguimiento.", example: "Ejemplo: ser puntual y cumplir lo que prometo revisar." },
    ],
  },
  {
    id: "oratoria",
    number: "05",
    title: "Oratoria",
    subtitle: "Hablar con claridad, presencia y servicio.",
    time: "Video + cuadernillo 20 min",
    videos: [{ title: "Oratoria", url: "https://www.youtube.com/watch?v=xvdvhEl5vwg", length: "Modulo" }],
    sourceIdeas: ["La palabra del lider necesita claridad y responsabilidad.", "Hablar requiere haber escuchado y comprendido primero.", "El mensaje debe cuidar a las personas y al objetivo comun.", "La comunicacion publica tambien es servicio."],
    exercises: [
      { id: "message", label: "El mensaje que necesito decir con claridad es:", help: "Escribe una idea central, no un discurso completo.", example: "Ejemplo: recordar el horario de cierre y pedir orden para cuidar la junta." },
      { id: "audience", label: "La persona o grupo que lo escuchara necesita:", help: "Piensa en tono, momento y palabras adecuadas.", example: "Ejemplo: instrucciones cortas porque sera al final de la sesion." },
      { id: "practice", label: "Lo practicare de esta manera:", help: "Elige una practica simple antes de hablar.", example: "Ejemplo: escribir tres puntos y repetirlos en voz alta dos veces." },
    ],
  },
  {
    id: "apadrinamiento",
    number: "06",
    title: "Apadrinamiento",
    subtitle: "Acompanar con teoria, herramientas y responsabilidad.",
    time: "2 videos + cuadernillo 25 min",
    videos: [
      { title: "Curso Apadrinamiento I", url: "https://www.youtube.com/watch?v=CwU_YxPBJm8", length: "Parte I" },
      { title: "Apadrinamiento II", url: "https://www.youtube.com/watch?v=qYpoHNnOpac", length: "Parte II" },
    ],
    sourceIdeas: ["El modulo recuerda puntos principales y esenciales del curso de apadrinamiento.", "Brinda conocimientos teoricos y herramientas practicas para el quinto paso.", "El acompanamiento sirve tambien para la contencion dentro de grupos y haciendas.", "La persona lider aprende saliendo de su zona de confort."],
    exercises: [
      { id: "support", label: "Una persona que necesita acompanamiento responsable podria necesitar:", help: "Describe la necesidad, no detalles intimos.", example: "Ejemplo: orden para preparar su quinto paso y saber con quien revisar dudas." },
      { id: "limit", label: "Un limite sano que debo cuidar al acompanar es:", help: "Piensa en horarios, confidencialidad, respeto o pedir apoyo.", example: "Ejemplo: no prometer respuestas que debo consultar con mi padrino." },
      { id: "tool", label: "La herramienta practica que voy a reforzar es:", help: "Elige una accion concreta del acompanamiento.", example: "Ejemplo: escuchar sin interrumpir y anotar dudas para revisarlas despues." },
    ],
  },
  {
    id: "coordinacion",
    number: "07",
    title: "Coordinacion",
    subtitle: "Ordenar el servicio para cuidar el objetivo comun.",
    time: "Video + cuadernillo 20 min",
    videos: [{ title: "Coordinacion", url: "https://www.youtube.com/watch?v=NBIVWtSx1S0", length: "Modulo" }],
    sourceIdeas: ["Guerreros de la Luz busca desarrollo humano a traves de herramientas del programa, la tanatologia y el humanismo.", "El liderazgo requiere apertura mental para no juzgar desde una perspectiva cerrada.", "Coordinar ayuda a transformar emociones, pensamientos y actitudes en servicio.", "El orden del modulo amplia la vision de quienes lideran o abriran grupo."],
    exercises: [
      { id: "order", label: "Un punto de orden que mi servicio necesita es:", help: "Piensa en horario, funciones, comunicacion, lista o seguimiento.", example: "Ejemplo: definir quien recibe, quien coordina y quien da seguimiento despues." },
      { id: "vision", label: "Una forma de tener mas apertura mental sera:", help: "Elige una actitud ante alguien diferente a ti.", example: "Ejemplo: escuchar su historia antes de decidir que no quiere cambiar." },
      { id: "coordination", label: "Mi siguiente coordinacion sera mas clara si:", help: "Completa con una accion concreta.", example: "Ejemplo: preparo el objetivo y los tiempos antes de comenzar." },
    ],
  },
  {
    id: "historia",
    number: "08",
    title: "Historia y Filosofia de FGDLL",
    subtitle: "Conocer de donde venimos y que cuidamos.",
    time: "Video + cuadernillo 20 min",
    videos: [{ title: "Historia y Filosofia Guerreros de la Luz", url: "https://www.youtube.com/watch?v=Q8Bot_dV2mo", length: "Modulo" }],
    sourceIdeas: ["Guerreros de la Luz abrio su primera sesion el 2 de junio de 2008.", "La primera experiencia se realizo el 20 de febrero de 2009.", "El modulo aborda historia, filosofia, cursos, talleres, escrituras, reglamentos y aplicaciones.", "Un guerrero de la luz esta para ayudar a sus hermanos, no para condenar."],
    exercises: [
      { id: "origin", label: "Saber la historia de FGDLL me ayuda a:", help: "Conecta la historia con tu servicio actual.", example: "Ejemplo: cuidar el espiritu de ayuda con el que nacio el grupo." },
      { id: "philosophy", label: "Una parte de la filosofia que quiero vivir mejor es:", help: "Elige una idea sencilla: ayudar, no condenar, reglamentos, servicio.", example: "Ejemplo: corregir sin humillar y pedir guia cuando no sepa que hacer." },
      { id: "care", label: "Algo que debo cuidar para honrar esta historia es:", help: "Piensa en conducta concreta.", example: "Ejemplo: hablar con respeto de la fraternidad y de quienes la sostienen." },
    ],
  },
  {
    id: "adn",
    number: "09",
    title: "ADN FGDLL",
    subtitle: "Integrar identidad, servicio y compromiso.",
    time: "Video + cuadernillo 25 min",
    videos: [{ title: "ADN FGDLL", url: "https://www.youtube.com/watch?v=vmZpoi3dbOk", length: "Modulo" }],
    sourceIdeas: ["El cierre integra la identidad del servicio dentro de FGDLL.", "El liderazgo se expresa en actitudes, decisiones y seguimiento.", "La regularizacion termina con un expediente claro y nombre confirmado para reconocimiento.", "El compromiso final debe poder practicarse durante siete dias."],
    exercises: [
      { id: "identity", label: "Para mi, vivir el ADN FGDLL significa:", help: "Escribe con tus palabras lo que entiendes despues del diplomado.", example: "Ejemplo: servir con amor, orden y responsabilidad aunque todavia este aprendiendo." },
      { id: "integration", label: "La idea mas importante que me llevo del diplomado es:", help: "Integra todos los temas, no solo este modulo.", example: "Ejemplo: primero debo liderarme para poder acompanar a otros." },
      { id: "recognition", label: "Antes de pedir mi reconocimiento necesito confirmar que:", help: "Revisa tu nombre, avance y compromiso personal.", example: "Ejemplo: mi nombre esta correcto y conclui cada cuadernillo con honestidad." },
    ],
  },
];

const blankTopic = (): TopicProgress => ({ status: "not_started", reviewed: false, answers: {} });
const initialState = (): WorkbookState => ({ profile: emptyProfile, topics: Object.fromEntries(topics.map((topic) => [topic.id, blankTopic()])) });
const statusLabel: Record<TopicStatus, string> = { not_started: "No iniciado", in_progress: "En proceso", completed: "Terminado", sent: "Enviado" };

function getTopic(state: WorkbookState, id: string) {
  return state.topics[id] || blankTopic();
}

function completionFor(topic: Topic, progress: TopicProgress) {
  const required = ["reviewed", ...topic.exercises.map((item) => item.id), "commitment", "authenticity"];
  const done = required.filter((field) => field === "reviewed" ? progress.reviewed : Boolean(progress.answers[field]?.trim())).length;
  return Math.round((done / required.length) * 100);
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "participante";
}

export default function DplPage() {
  const [state, setState] = useState<WorkbookState>(initialState);
  const [activeId, setActiveId] = useState(topics[0].id);
  const [message, setMessage] = useState("");
  const activeTopic = topics.find((topic) => topic.id === activeId) || topics[0];
  const activeIndex = topics.findIndex((topic) => topic.id === activeTopic.id);
  const progress = getTopic(state, activeTopic.id);
  const completedCount = topics.filter((topic) => ["completed", "sent"].includes(getTopic(state, topic.id).status)).length;
  const sentCount = topics.filter((topic) => getTopic(state, topic.id).status === "sent").length;
  const generalProgress = Math.round((completedCount / topics.length) * 100);
  const allDone = completedCount === topics.length;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WorkbookState;
        setState({ ...initialState(), ...parsed, profile: { ...emptyProfile, ...parsed.profile } });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const summary = useMemo(() => topics.map((topic) => {
    const item = getTopic(state, topic.id);
    return `${topic.number}. ${topic.title}: ${statusLabel[item.status]}`;
  }).join("\n"), [state]);

  function updateProfile(field: keyof Profile, value: string) {
    setState((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  }

  function updateTopic(id: string, patch: Partial<TopicProgress>) {
    setState((current) => {
      const currentTopic = getTopic(current, id);
      const next = { ...currentTopic, ...patch };
      if (next.status === "not_started") next.status = "in_progress";
      return { ...current, topics: { ...current.topics, [id]: next } };
    });
  }

  function updateAnswer(id: string, value: string) {
    updateTopic(activeTopic.id, { answers: { ...progress.answers, [id]: value }, status: "in_progress" });
  }

  async function buildPdf(topic?: Topic) {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "letter" });
    const title = topic ? `Cuadernillo ${topic.number} - ${topic.title}` : "Expediente final DPL1 - 2022";
    const name = state.profile.fullName || "Participante";
    let y = 18;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(title, 16, y);
    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Nombre: ${name}`, 16, y);
    y += 6;
    pdf.text(`Grupo/Zona: ${state.profile.group || "No capturado"} / ${state.profile.zone || "No capturada"}`, 16, y);
    y += 6;
    pdf.text(`Fecha: ${new Date().toLocaleString("es-MX")}`, 16, y);
    y += 10;
    const lines: string[] = [];
    if (topic) {
      const item = getTopic(state, topic.id);
      lines.push("Ideas base del modulo:");
      topic.sourceIdeas.forEach((idea) => lines.push(`- ${idea}`));
      lines.push("", "Respuestas:");
      topic.exercises.forEach((exercise) => lines.push(`${exercise.label} ${item.answers[exercise.id] || "Sin respuesta"}`));
      lines.push(`Compromiso de 7 dias: ${item.answers.commitment || "Sin respuesta"}`);
      lines.push(`Declaracion: ${item.answers.authenticity || "Sin confirmar"}`);
    } else {
      lines.push("Avance general:", summary, "", `Nombre para reconocimiento: ${state.profile.recognitionName || name}`);
      topics.forEach((item) => {
        const topicProgress = getTopic(state, item.id);
        lines.push("", `${item.number}. ${item.title}`, `Compromiso: ${topicProgress.answers.commitment || "Sin respuesta"}`, `Integracion: ${item.exercises.map((ex) => topicProgress.answers[ex.id]).filter(Boolean).join(" / ") || "Sin respuestas"}`);
      });
    }
    pdf.setFontSize(9);
    pdf.splitTextToSize(lines.join("\n"), 178).forEach((line: string) => {
      if (y > 258) { pdf.addPage(); y = 18; }
      pdf.text(line, 16, y);
      y += 5;
    });
    return pdf;
  }

  async function completeTopic() {
    if (!progress.reviewed || !progress.answers.authenticity?.trim() || !progress.answers.commitment?.trim()) {
      setMessage("Antes de terminar, confirma el video, la declaracion de autenticidad y el compromiso de 7 dias.");
      return;
    }
    updateTopic(activeTopic.id, { status: "completed", completedAt: new Date().toISOString() });
    setMessage("Cuadernillo registrado como terminado en este portal. Puedes generar PDF o compartirlo.");
  }

  async function downloadPdf(topic?: Topic) {
    const pdf = await buildPdf(topic);
    const fileName = topic ? `DPL1-2022-${topic.number}-${safeFileName(state.profile.fullName)}.pdf` : `DPL1-2022-expediente-${safeFileName(state.profile.fullName)}.pdf`;
    pdf.save(fileName);
  }

  async function sharePdf(topic: Topic) {
    const pdf = await buildPdf(topic);
    const fileName = `DPL1-2022-${topic.number}-${safeFileName(state.profile.fullName)}.pdf`;
    const file = new File([pdf.output("blob")], fileName, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: fileName, text: `Envio mi cuadernillo ${topic.title} del DPL1 2022.`, files: [file] });
      updateTopic(topic.id, { status: "sent", sentAt: new Date().toISOString() });
      return;
    }
    pdf.save(fileName);
    const text = encodeURIComponent(`Hola, envio mi cuadernillo ${topic.title} del Diplomado en Liderazgo I 2022. Nombre: ${state.profile.fullName || "pendiente"}. Ya descargue el PDF para adjuntarlo.`);
    window.open(`https://wa.me/${contactPhone}?text=${text}`, "_blank", "noopener,noreferrer");
    updateTopic(topic.id, { status: "sent", sentAt: new Date().toISOString() });
  }

  return <><SubHeader label="Diplomado en Liderazgo I"/><main className="dpl-workbook-page">
    <section className="dpl-workbook-hero" id="2022"><div className="shell">
      <span className="eyebrow light">Regularizacion - DPL1 2022</span>
      <h1>Termina tu diplomado con evidencia clara.</h1>
      <p>Un cuadernillo por tema: mira el video, responde ejercicios sencillos, genera tu PDF y registra tu avance sin depender de WhatsApp para acreditar.</p>
      <div className="dpl-progress-card"><div><strong>{generalProgress}%</strong><span>{completedCount} de {topics.length} temas terminados - {sentCount} enviados</span></div><i><b style={{ width: `${generalProgress}%` }} /></i></div>
    </div></section>

    <section className="dpl-workspace shell">
      <aside className="dpl-sidebar">
        <section className="participant-card">
          <span>Datos del participante</span>
          <input value={state.profile.fullName} onChange={(event) => updateProfile("fullName", event.target.value)} placeholder="Nombre completo" />
          <input value={state.profile.group} onChange={(event) => updateProfile("group", event.target.value)} placeholder="Grupo o centro" />
          <input value={state.profile.zone} onChange={(event) => updateProfile("zone", event.target.value)} placeholder="Zona" />
          <input type="email" value={state.profile.email} onChange={(event) => updateProfile("email", event.target.value)} placeholder="Correo" />
          <input value={state.profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} placeholder="Telefono" />
        </section>
        <nav className="topic-nav" aria-label="Temas DPL1 2022">
          {topics.map((topic) => {
            const item = getTopic(state, topic.id);
            return <button key={topic.id} className={topic.id === activeTopic.id ? "active" : ""} onClick={() => setActiveId(topic.id)}>
              <b>{topic.number}</b><span>{topic.title}<small>{statusLabel[item.status]}</small></span>
            </button>;
          })}
        </nav>
      </aside>

      <section className="workbook-panel">
        <header className="workbook-head">
          <div><span>Tema {activeTopic.number} de {topics.length}</span><h2>{activeTopic.title}</h2><p>{activeTopic.subtitle}</p></div>
          <strong>{completionFor(activeTopic, progress)}%</strong>
        </header>

        {activeIndex > 0 && <div className="previous-check"><b>Antes de iniciar</b><label>Cumpliste el compromiso del tema anterior?<textarea value={progress.answers.previousCommitment || ""} onChange={(event) => updateAnswer("previousCommitment", event.target.value)} rows={3} placeholder="Ejemplo: si, durante la semana practique escuchar sin interrumpir en mi grupo." /></label></div>}

        <div className="video-grid">
          {activeTopic.videos.map((video) => <a key={video.url} href={video.url} target="_blank" rel="noreferrer"><small>{video.length}</small><b>{video.title}</b><span>Ver video en YouTube</span></a>)}
        </div>
        <label className="review-check"><input type="checkbox" checked={progress.reviewed} onChange={(event) => updateTopic(activeTopic.id, { reviewed: event.target.checked, status: "in_progress" })} /> Confirmo que revise el/los video(s) original(es) antes de responder.</label>

        <section className="source-box"><span>Ideas base tomadas de las transcripciones</span>{activeTopic.sourceIdeas.map((idea) => <p key={idea}>{idea}</p>)}</section>

        <div className="exercise-list">
          {activeTopic.exercises.map((exercise) => <label key={exercise.id} className="exercise-card">
            <span>{exercise.label}</span>
            <small>{exercise.help}</small>
            <em>{exercise.example}</em>
            <textarea value={progress.answers[exercise.id] || ""} onChange={(event) => updateAnswer(exercise.id, event.target.value)} rows={4} />
          </label>)}
        </div>

        <div className="integration-card">
          <label><span>Compromiso de 7 dias</span><small>Escribe una accion pequena que puedas cumplir y revisar.</small><textarea value={progress.answers.commitment || ""} onChange={(event) => updateAnswer("commitment", event.target.value)} rows={3} placeholder="Ejemplo: durante 7 dias voy a llegar 10 minutos antes y escuchar una necesidad del grupo antes de opinar." /></label>
          <label className="auth-check"><input type="checkbox" checked={progress.answers.authenticity === "Confirmado"} onChange={(event) => updateAnswer("authenticity", event.target.checked ? "Confirmado" : "")} /> Confirmo que revise el material y que estas respuestas corresponden a mi reflexion personal.</label>
        </div>

        {message && <p className="workbook-message">{message}</p>}
        <div className="workbook-actions">
          <button className="button button-outline" onClick={() => void downloadPdf(activeTopic)}>Generar PDF</button>
          <button className="button button-outline" onClick={() => void sharePdf(activeTopic)}>Compartir / WhatsApp</button>
          <button className="button button-gold" onClick={() => void completeTopic()}>Registrar tema terminado</button>
        </div>
      </section>
    </section>

    <section className="final-record"><div className="shell">
      <div><span className="eyebrow">Expediente final</span><h2>Cierre de regularizacion.</h2><p>Cuando todos los temas esten terminados, genera tu expediente, confirma tu nombre y solicita el reconocimiento DPL1 - 2022.</p></div>
      <aside>
        <textarea readOnly value={summary} rows={9} aria-label="Resumen de avance" />
        <label>Nombre como aparecera en el reconocimiento<input value={state.profile.recognitionName} onChange={(event) => updateProfile("recognitionName", event.target.value)} placeholder={state.profile.fullName || "Nombre completo"} /></label>
        <button className="button button-outline" onClick={() => void downloadPdf()}>Descargar expediente final</button>
        <Link className={allDone ? "button button-gold" : "button button-outline disabled-link"} href="/formacion#solicitud-reconocimiento" aria-disabled={!allDone}>Solicitar reconocimiento DPL1 / 2022</Link>
      </aside>
    </div></section>
  </main><SubFooter/></>;
}
