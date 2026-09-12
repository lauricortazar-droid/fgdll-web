"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import centerData from "../public-centers-data.json";

type Center = {
  id?: number;
  n?: number;
  name?: string;
  network?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  verifiedAt?: string | null;
};
type FormState = {
  requesterName: string;
  whatsapp: string;
  city: string;
  relationship: string;
  ageGroup: string;
  helpType: string;
  danger: string;
  preferredTime: string;
  consentContact: boolean;
  consentPrivacy: boolean;
  website: string;
};
const emptyForm: FormState = {
  requesterName: "",
  whatsapp: "",
  city: "",
  relationship: "",
  ageGroup: "unknown",
  helpType: "unsure",
  danger: "unsure",
  preferredTime: "",
  consentContact: false,
  consentPrivacy: false,
  website: "",
};
const networks = [
  { key: "Gladiadores", label: "Gladiadores" },
  { key: "La Legión", label: "La Legión" },
  { key: "Despertares", label: "Despertares" },
  { key: "Fenix", label: "Fénix" },
  { key: "Amazonas", label: "Amazonas" },
];
const steps = [
  [
    "01",
    "Solicitas orientación",
    "Nos compartes sólo la información necesaria para poder contactarte.",
  ],
  [
    "02",
    "Escuchamos la situación",
    "Un orientador explica las alternativas sin diagnosticar ni presionar una decisión.",
  ],
  [
    "03",
    "Revisas las opciones",
    "La familia compara grupos, centros residenciales y apoyos profesionales.",
  ],
  [
    "04",
    "El centro valora",
    "Si eliges atención residencial, el centro confirma requisitos, disponibilidad y admisión.",
  ],
];

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No fue posible enviar la solicitud.");
  return data;
}

export function OrientationClient({ faq }: { faq: string[][] }) {
  const [centers, setCenters] = useState<Center[]>(
    centerData.centros as Center[],
  );
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [folio, setFolio] = useState("");
  useEffect(() => {
    fetch("/api/centers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => Array.isArray(data.centers) && setCenters(data.centers))
      .catch(() => undefined);
  }, []);
  const networkCards = useMemo(
    () =>
      networks.map((network) => {
        const matches = centers.filter(
          (center) =>
            (center.network || "").toLocaleLowerCase("es") ===
            network.key.toLocaleLowerCase("es"),
        );
        const cities = Array.from(
          new Set(matches.map((center) => center.city).filter(Boolean)),
        ).slice(0, 4);
        return { ...network, matches, cities };
      }),
    [centers],
  );

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch("/api/orientation-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }).then(readJson);
      setFolio(result.id);
      setForm(emptyForm);
      setMessage(
        "Recibimos tu solicitud. Administración podrá consultarla de forma privada y ponerse en contacto contigo en el horario indicado.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible enviar la solicitud.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="family-help-page">
      <section className="family-help-hero">
        <div className="shell family-help-hero-grid">
          <div>
            <span className="eyebrow light">
              Orientación para familias · Mérida y Yucatán
            </span>
            <h1>¿Buscas ayuda para un familiar con adicciones en Mérida?</h1>
            <p className="family-help-lead">
              No tienes que resolverlo todo hoy ni hacerlo solo. Podemos
              escucharte, ayudarte a entender la situación y orientarte hacia
              una alternativa adecuada.
            </p>
            <div className="family-help-actions">
              <a className="button button-gold" href="#orientacion">
                Solicitar orientación
              </a>
              <a className="button button-ghost" href="#centros-relacion">
                Conocer los centros
              </a>
              <a className="emergency-link" href="#emergencia">
                ¿Es una emergencia?
              </a>
            </div>
          </div>
          <aside>
            <span>ACLARACIÓN IMPORTANTE</span>
            <h2>FGDLL no es un anexo ni un centro residencial.</h2>
            <p>
              Somos una fraternidad de grupos de ayuda y una red de orientación.
              Cuando se considera atención residencial, conectamos a la familia
              con centros que realizan su propia valoración.
            </p>
          </aside>
        </div>
      </section>

      <section className="section immediate-risk" id="emergencia">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow">Primero</span>
              <h2>Revisemos si existe un peligro inmediato.</h2>
            </div>
            <p>
              Esta página orienta; no diagnostica ni sustituye atención
              profesional.
            </p>
          </div>
          <div className="risk-grid">
            <article className="risk-urgent">
              <span>EMERGENCIA INMEDIATA</span>
              <h3>Llama al 911</h3>
              <p>
                Si está inconsciente, no responde, tiene dificultad para
                respirar, convulsiones, posible sobredosis, violencia activa o
                existe peligro inmediato.
              </p>
              <a href="tel:911">Llamar al 911</a>
            </article>
            <article>
              <span>CRISIS EMOCIONAL</span>
              <h3>Línea de la Vida</h3>
              <p>
                Orientación nacional sobre salud mental y consumo de sustancias,
                disponible las 24 horas.
              </p>
              <a href="tel:8009112000">800 911 2000</a>
            </article>
            <article>
              <span>SIN PELIGRO INMEDIATO</span>
              <h3>Continúa acompañado</h3>
              <p>
                Conoce grupos, opciones residenciales y la forma de solicitar
                orientación.
              </p>
              <a href="#orientacion">Ver opciones</a>
            </article>
          </div>
        </div>
      </section>

      <section className="section relationship-centers" id="centros-relacion">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow light">Opciones residenciales</span>
              <h2>Centros con los que mantenemos relación de trabajo.</h2>
            </div>
            <p>
              No son sucursales de FGDLL. Cada centro responde por su
              valoración, servicios, personal, costos y condiciones de admisión.
            </p>
          </div>
          <div className="relationship-grid">
            {networkCards.map((network, index) => (
              <article key={network.key}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{network.label}</h3>
                {network.matches.length ? (
                  <>
                    <strong>
                      {network.matches.length}{" "}
                      {network.matches.length === 1
                        ? "centro registrado"
                        : "centros registrados"}
                    </strong>
                    <p>
                      {network.cities.join(" · ") ||
                        "Ubicación disponible en el directorio"}
                    </p>
                    <small>
                      Datos de contacto disponibles; confirma directamente
                      servicios, población, costos y disponibilidad.
                    </small>
                  </>
                ) : (
                  <>
                    <strong>Información por confirmar</strong>
                    <p>La ficha todavía no tiene datos públicos verificados.</p>
                    <small>
                      No publicaremos servicios ni contactos hasta que sean
                      confirmados.
                    </small>
                  </>
                )}
                <Link href="/centros#directorio-centros">
                  Consultar directorio →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="orientation-process">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow light">Cómo funciona</span>
            <h2>Orientar no es decidir por la familia.</h2>
          </div>
          <div className="orientation-process-grid">
            {steps.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="process-boundary">
            FGDLL no realiza diagnósticos ni garantiza una admisión. La decisión
            final corresponde a la familia y a la persona que recibirá la
            atención, dentro del marco legal aplicable.
          </p>
        </div>
      </section>

      <section className="section orientation-form-section" id="orientacion">
        <div className="shell orientation-form-layout">
          <div>
            <span className="eyebrow">Solicitar orientación</span>
            <h2>Cuéntanos sólo lo necesario para comenzar.</h2>
            <p>
              No necesitas escribir una historia clínica. La información
              sensible puede conversarse después por un canal privado,
              únicamente si resulta necesaria.
            </p>
            <div className="form-assurance">
              <strong>Privado</strong>
              <span>
                La solicitud y las notas de seguimiento sólo serán visibles para
                administradores autorizados.
              </span>
            </div>
            <div className="orientation-direct-contact">
              <strong>¿Prefieres hablar ahora?</strong>
              <p>Puedes dejar tus datos en el formulario o contactarnos directamente.</p>
              <div>
                <a href="https://wa.me/529995481194?text=Hola%2C%20necesito%20orientaci%C3%B3n%20de%20Guerreros%20de%20la%20Luz" target="_blank" rel="noopener noreferrer">WhatsApp · 999 548 1194</a>
                <a href="tel:+529995481194">Llamar · 999 548 1194</a>
              </div>
            </div>
          </div>
          <form className="family-orientation-form" onSubmit={submit}>
            <input
              className="form-trap"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form.website}
              onChange={(e) => field("website", e.target.value)}
            />
            <label>
              <span>Tu nombre</span>
              <input
                required
                value={form.requesterName}
                onChange={(e) => field("requesterName", e.target.value)}
              />
            </label>
            <label>
              <span>WhatsApp</span>
              <input
                required
                inputMode="tel"
                placeholder="999 000 0000"
                value={form.whatsapp}
                onChange={(e) => field("whatsapp", e.target.value)}
              />
            </label>
            <label>
              <span>Ciudad</span>
              <input
                value={form.city}
                onChange={(e) => field("city", e.target.value)}
              />
            </label>
            <label>
              <span>Relación con la persona</span>
              <input
                required
                placeholder="Madre, padre, pareja, hermano…"
                value={form.relationship}
                onChange={(e) => field("relationship", e.target.value)}
              />
            </label>
            <label>
              <span>Edad</span>
              <select
                value={form.ageGroup}
                onChange={(e) => field("ageGroup", e.target.value)}
              >
                <option value="unknown">No estoy seguro</option>
                <option value="adult">Mayor de edad</option>
                <option value="minor">Menor de edad</option>
              </select>
            </label>
            <label>
              <span>Tipo de ayuda</span>
              <select
                value={form.helpType}
                onChange={(e) => field("helpType", e.target.value)}
              >
                <option value="unsure">Todavía no lo sé</option>
                <option value="group">Encontrar un grupo</option>
                <option value="family">Orientación familiar</option>
                <option value="residential">Valoración residencial</option>
              </select>
            </label>
            <label>
              <span>¿Existe peligro inmediato?</span>
              <select
                value={form.danger}
                onChange={(e) => field("danger", e.target.value)}
              >
                <option value="unsure">No estoy seguro</option>
                <option value="no">No</option>
                <option value="yes">Sí</option>
              </select>
            </label>
            <label>
              <span>Horario preferido de contacto</span>
              <input
                placeholder="Ej. después de las 6 p. m."
                value={form.preferredTime}
                onChange={(e) => field("preferredTime", e.target.value)}
              />
            </label>
            {form.danger === "yes" && (
              <div className="danger-form-warning">
                <strong>No esperes la respuesta del formulario.</strong>
                <span>
                  Si existe peligro inmediato, llama al 911. Para una crisis
                  emocional llama al 800 911 2000.
                </span>
              </div>
            )}
            <div className="privacy-note" id="privacidad">
              <strong>Aviso breve de privacidad</strong>
              <p>
                Usaremos estos datos únicamente para atender tu solicitud de
                orientación. No aparecerán en el portal público y sólo podrán
                consultarlos administradores autorizados.
              </p>
            </div>
            <label className="consent-row">
              <input
                type="checkbox"
                checked={form.consentContact}
                onChange={(e) => field("consentContact", e.target.checked)}
              />
              <span>
                Autorizo que FGDLL me contacte por el medio proporcionado.
              </span>
            </label>
            <label className="consent-row">
              <input
                type="checkbox"
                checked={form.consentPrivacy}
                onChange={(e) => field("consentPrivacy", e.target.checked)}
              />
              <span>He leído y acepto el aviso breve de privacidad.</span>
            </label>
            <button className="button button-gold" disabled={busy}>
              {busy ? "Enviando…" : "Enviar solicitud"}
            </button>
            {message && (
              <div
                className={folio ? "form-message ok" : "form-message"}
                role="status"
              >
                <strong>
                  {folio ? `Folio ${folio}` : "Revisa la información"}
                </strong>
                <span>{message}</span>
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="family-support">
        <div className="shell family-support-grid">
          <div>
            <span className="eyebrow light">Mientras encuentras ayuda</span>
            <h2>No tienes que cargar esto solo.</h2>
          </div>
          <ul>
            <li>Prioriza la seguridad inmediata.</li>
            <li>
              Evita discutir cuando la persona esté intoxicada o violenta.
            </li>
            <li>No entregues dinero para detener una crisis de consumo.</li>
            <li>
              Busca acompañamiento para la familia, aunque todavía no acepte
              ayuda.
            </li>
            <li>
              Anota hechos importantes para explicarlos durante una valoración
              profesional.
            </li>
            <li>
              Pedir ayuda no significa traicionar ni abandonar a tu familiar.
            </li>
          </ul>
        </div>
      </section>

      <section className="section help-faq">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2>Respuestas claras antes de decidir.</h2>
          </div>
          <div className="faq-list">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <a className="mobile-help-cta" href="#orientacion">
        Solicitar orientación
      </a>
    </main>
  );
}
