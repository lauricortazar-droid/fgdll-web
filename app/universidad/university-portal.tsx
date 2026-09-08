"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SubFooter, SubHeader } from "../section-shell";

type Tab = "registration" | "centers" | "certificate";
const versions = [
  { value: "2022", label: "Versión 2022", note: "Básico obligatorio", text: "La base formativa que todo participante debe completar." },
  { value: "2025", label: "Versión 2025", note: "Actualización", text: "Recorrido de liderazgo correspondiente a la generación 2025." },
  { value: "2026", label: "Versión 2026", note: "Generación actual", text: "Formación vigente para quienes cursan el diplomado este año." },
];

async function send(url: string, form: HTMLFormElement) {
  const body = Object.fromEntries(new FormData(form).entries());
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar el registro.");
  return data as Record<string, unknown>;
}

export function UniversityPortal() {
  const [tab, setTab] = useState<Tab>("registration");
  const [version, setVersion] = useState("2022");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, url: string, success: (data: Record<string, unknown>) => string) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage(null);
    try { const data = await send(url, form); setMessage({ kind: "ok", text: success(data) }); form.reset(); }
    catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "No fue posible completar el registro." }); }
    finally { setBusy(false); }
  }

  return <><SubHeader label="Universidad FGDLL" /><main className="unified-university">
    <section className="uni-hero"><div className="shell uni-hero-grid"><div><span className="eyebrow light">Universidad FGDLL · Formación para el servicio</span><h1>Tu formación comienza <em>contigo.</em></h1><p>Inscríbete, continúa tu diplomado y solicita tu reconocimiento sin salir del portal institucional.</p><div className="hero-actions"><a className="button button-gold" href="#registro">Entrar a Universidad →</a><Link className="button button-ghost" href="/universidad/dpl1-2022">Ver Diplomado 2022</Link></div></div><aside><img src="/logo-gdll.png" alt="Escudo de Guerreros de la Luz" /><small>CONTACTO UNIVERSIDAD</small><a href="https://wa.me/529999011852?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20Universidad%20FGDLL">WhatsApp · 999 901 1852</a><a href="tel:+529999011852">Llamar · 999 901 1852</a></aside></div></section>
    <section className="section uni-portal" id="registro"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Registro institucional</span><h2>Elige lo que necesitas.</h2></div><p>Todos los registros quedan guardados en la misma base del Portal FGDLL y pueden ser atendidos desde Administración.</p></div><div className="uni-tabs" role="tablist"><button className={tab === "registration" ? "active" : ""} onClick={() => { setTab("registration"); setMessage(null); }}>Inscripción</button><button className={tab === "centers" ? "active" : ""} onClick={() => { setTab("centers"); setMessage(null); }}>Directores de centros</button><button className={tab === "certificate" ? "active" : ""} onClick={() => { setTab("certificate"); setMessage(null); }}>Reconocimiento</button></div>
      {message && <div className={`uni-message ${message.kind}`}>{message.text}</div>}
      {tab === "registration" && <div className="uni-workspace"><div><h3>Selecciona tu generación</h3><div className="uni-version-grid">{versions.map((item) => <button type="button" key={item.value} className={version === item.value ? "active" : ""} onClick={() => setVersion(item.value)}><b>{item.label}</b><span>{item.note}</span><p>{item.text}</p></button>)}</div></div><form className="report-form" onSubmit={(event) => submit(event, "/api/university/registrations", () => "Tu registro quedó guardado. Ya puedes comenzar y enviar tus actividades.")}><input type="hidden" name="diplomaVersion" value={version} /><label>Nombre completo<input name="fullName" required maxLength={180} /></label><label>Correo electrónico<input name="email" type="email" required maxLength={254} /></label><label>Número de celular<input name="mobilePhone" type="tel" required inputMode="tel" /></label><label>Grupo o centro<input name="organization" required maxLength={180} /></label><label>Tipo de participante<select name="participantType" defaultValue="participant"><option value="participant">Participante</option><option value="center_director">Director de centro</option></select></label><button className="button button-gold" disabled={busy}>{busy ? "Guardando…" : `Registrarme en ${version}`}</button></form></div>}
      {tab === "centers" && <div className="uni-workspace single-info"><div><span className="eyebrow">Registro colectivo</span><h3>Inscribe a los participantes de tu centro.</h3><p>Escribe un nombre completo por línea. Administración recibirá la relación y podrá darle seguimiento.</p></div><form className="report-form" onSubmit={(event) => submit(event, "/api/university/center-batches", (data) => `Relación guardada con el folio ${data.id}. Participantes registrados: ${data.participantCount}.`)}><label>Correo del director<input name="directorEmail" type="email" required /></label><label>Número de contacto<input name="mobilePhone" type="tel" required /></label><label>Nombre del centro<input name="centerName" required /></label><label>Generación<select name="diplomaVersion" defaultValue="2026">{versions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Participantes, uno por línea<textarea name="participantNames" rows={8} required /></label><button className="button button-gold" disabled={busy}>{busy ? "Guardando…" : "Guardar relación"}</button></form></div>}
      {tab === "certificate" && <div className="uni-workspace single-info"><div><span className="eyebrow">Solicitud de reconocimiento</span><h3>Primero validamos tu registro.</h3><p>La impresión o reimpresión tiene un costo aproximado de <strong>$50 a $100 MXN</strong>, según el caso. Nos comunicaremos contigo para confirmar la información, el costo final y la entrega.</p></div><form className="report-form" onSubmit={(event) => submit(event, "/api/university/certificates", (data) => `Solicitud registrada con el folio ${data.id}. Nos comunicaremos contigo para validarla.`)}><label>Nombre completo<input name="fullName" required /></label><label>Número de contacto<input name="mobilePhone" type="tel" required /></label><label>Grupo o centro<input name="groupName" required /></label><label>Generación<select name="diplomaVersion" defaultValue="2022">{versions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Pago del diplomado<select name="paymentStatus" defaultValue="total"><option value="total">Pago total realizado</option><option value="partial">Pago parcial realizado</option><option value="pending">Pago pendiente</option></select></label><label>Tipo de solicitud<select name="requestType" defaultValue="printing"><option value="printing">Primera impresión</option><option value="reprinting">Reimpresión</option></select></label><button className="button button-gold" disabled={busy}>{busy ? "Registrando…" : "Solicitar reconocimiento"}</button></form></div>}
    </div></section>
    <section className="section uni-learning"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">Diplomado en Liderazgo I</span><h2>Comprender. Reflexionar. Expresar.</h2></div><p>Cada módulo se convierte en una oportunidad para servir con más conciencia, orden y humanidad.</p></div><div className="uni-route"><article><b>01</b><h3>Mira la clase</h3><p>Escucha el módulo completo y reconoce las ideas esenciales.</p></article><article><b>02</b><h3>Comprende</h3><p>Relaciona el contenido con tu experiencia y tu servicio.</p></article><article><b>03</b><h3>Escribe</h3><p>Realiza cuatro cuartillas a mano, con tus propias palabras.</p></article><article><b>04</b><h3>Entrega</h3><p>Envía fotografías claras, completas y en el orden correcto.</p></article></div><div className="uni-course-action"><div><span>GENERACIÓN 2022</span><h3>Diez módulos disponibles</h3></div><Link className="button button-gold" href="/universidad/dpl1-2022">Entrar al diplomado →</Link></div></div></section>
  </main><SubFooter /></>;
}
