"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import data from "../public-centers-data.json";
import { SubFooter, SubHeader } from "../section-shell";

const treatmentSteps = [
  [
    "01",
    "Primer contacto",
    "La familia o la persona solicita información, explica la situación y confirma disponibilidad.",
  ],
  [
    "02",
    "Valoración e ingreso",
    "El centro explica requisitos, condiciones, costos, reglas, responsables y posibles criterios de canalización.",
  ],
  [
    "03",
    "Estancia residencial",
    "Se desarrolla el programa del centro con rutinas, acompañamiento, convivencia, actividades y seguimiento del proceso.",
  ],
  [
    "04",
    "Egreso y continuidad",
    "Se prepara la salida y se acuerdan apoyos de seguimiento, red familiar, grupo y atención profesional cuando corresponda.",
  ],
];

const admissionQuestions = [
  "¿Quién es el responsable legal y operativo?",
  "¿Qué profesionales participan y cómo se acreditan?",
  "¿Cuáles son las reglas, costos y duración estimada?",
  "¿Cómo se atienden urgencias médicas o de salud mental?",
  "¿Qué comunicación tendrá la familia?",
  "¿Cómo se protegen la dignidad y los datos personales?",
  "¿Qué seguimiento existe después del egreso?",
];

export default function CentersPage() {
  const [centers, setCenters] = useState(
    data.centros as Array<{
      id?: number;
      n?: number;
      name?: string;
      nombre?: string;
      network?: string;
      familia?: string;
      state?: string;
      city?: string;
      address?: string;
      direccion?: string;
      responsibleName?: string;
      phone?: string;
      tel?: string;
      whatsapp?: string;
      description?: string;
      services?: string;
      mapsUrl?: string;
      verifiedAt?: string | null;
    }>,
  );
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("Todos");
  useEffect(() => {
    fetch("/api/centers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((result) => setCenters(result.centers || []))
      .catch(() => undefined);
  }, []);
  const families = [
    "Todos",
    ...Array.from(
      new Set(centers.map((c) => c.network || c.familia || "Red FGDLL")),
    ),
  ];
  const filtered = useMemo(
    () =>
      centers.filter((c) => {
        const centerFamily = c.network || c.familia || "Red FGDLL";
        const text =
          `${c.name || c.nombre} ${centerFamily} ${c.address || c.direccion} ${c.city || ""} ${c.state || ""} ${c.responsibleName || ""}`.toLocaleLowerCase(
            "es",
          );
        return (
          (family === "Todos" || centerFamily === family) &&
          text.includes(query.toLocaleLowerCase("es").trim())
        );
      }),
    [centers, query, family],
  );
  return (
    <>
      <SubHeader label="Centros y tratamiento" />
      <main className="subpage centers-page residential-page">
        <section className="subhero centers-hero">
          <div className="shell subhero-grid">
            <div>
              <span className="eyebrow light">
                Centros con relación de trabajo
              </span>
              <h1>
                Información clara
                <br />
                <em>antes de decidir.</em>
              </h1>
              <p>
                FGDLL no es un centro residencial. Este directorio permite
                comparar información disponible de centros independientes con
                los que mantenemos relación de trabajo; no son sucursales ni
                propiedad de la fraternidad.
              </p>
              <div className="hero-actions">
                <a className="button button-gold" href="#directorio-centros">
                  Buscar un centro
                </a>
                <Link className="button button-ghost" href="/centros/acceso">
                  Registrar o administrar mi centro
                </Link>
              </div>
            </div>
            <div className="center-stat">
              <strong>{centers.length}</strong>
              <span>centros registrados</span>
              <p>
                Confirma directamente disponibilidad, requisitos y condiciones
                de ingreso.
              </p>
            </div>
          </div>
        </section>
        <section className="section treatment-overview" id="tratamiento">
          <div className="shell">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">Orientación inicial</span>
                <h2>¿Qué es el tratamiento residencial?</h2>
              </div>
              <p>
                Es una modalidad de atención en la que la persona permanece
                temporalmente en un centro con estructura cotidiana y
                acompañamiento. Cada establecimiento debe explicar con precisión
                su modelo, alcances y responsables.
              </p>
            </div>
            <div className="treatment-step-grid">
              {treatmentSteps.map(([number, title, text]) => (
                <article key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="treatment-boundary">
              <strong>Importante</strong>
              <p>
                FGDLL orienta el contacto y la red comunitaria. La atención
                residencial no sustituye servicios médicos, psiquiátricos o
                psicológicos cuando éstos son necesarios.
              </p>
            </div>
          </div>
        </section>
        <section className="section admission-section">
          <div className="shell admission-grid">
            <div>
              <span className="eyebrow light">Antes del ingreso</span>
              <h2>Preguntas que protegen a la persona y a su familia.</h2>
              <p>
                No tomes una decisión únicamente por urgencia o presión.
                Solicita respuestas claras y conserva por escrito la información
                esencial.
              </p>
            </div>
            <ol>
              {admissionQuestions.map((question, index) => (
                <li key={question}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{question}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="section center-directory" id="directorio-centros">
          <div className="shell">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">Información para comparar</span>
                <h2>Centros con los que mantenemos relación de trabajo.</h2>
              </div>
              <div>
                <p>
                  Solo se publica información revisada por Administración FGDLL.
                  Confirma directamente población, servicios, requisitos, costos
                  y disponibilidad; cuando falte un dato, se indicará como
                  información por confirmar.
                </p>
                <Link href="/centros/acceso">Soy director de un centro →</Link>
              </div>
            </div>
            <div className="directory-tools">
              <label className="search-field">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, ciudad, red o responsable…"
                />
              </label>
              <div className="filter-row">
                {families.map((item) => (
                  <button
                    key={item}
                    className={family === item ? "active" : ""}
                    onClick={() => setFamily(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="result-line">
              Mostrando <strong>{filtered.length}</strong> de {centers.length}{" "}
              centros · Revisa la fecha de verificación de cada ficha
            </div>
            <div className="centers-grid">
              {filtered.map((c, index) => {
                const name = c.name || c.nombre || "Centro";
                const phone = c.phone || c.tel || "";
                const whatsapp = c.whatsapp || phone;
                return (
                  <article className="center-card" key={c.id || c.n || index}>
                    <div className="center-card-head">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <small>{c.network || c.familia || "Red FGDLL"}</small>
                    </div>
                    <h3>{name}</h3>
                    <dl>
                      <div>
                        <dt>Ubicación</dt>
                        <dd>
                          {[c.city, c.state].filter(Boolean).join(", ") ||
                            c.address ||
                            c.direccion}
                        </dd>
                      </div>
                      {(c.address || c.direccion) && (
                        <div>
                          <dt>Dirección</dt>
                          <dd>{c.address || c.direccion}</dd>
                        </div>
                      )}
                      {c.responsibleName && (
                        <div>
                          <dt>Responsable</dt>
                          <dd>{c.responsibleName}</dd>
                        </div>
                      )}
                      {c.services && (
                        <div>
                          <dt>Servicios</dt>
                          <dd>{c.services}</dd>
                        </div>
                      )}
                    </dl>
                    {c.description && <p>{c.description}</p>}
                    <p className="center-pending-data">
                      <strong>Información por confirmar:</strong> población y
                      edades admitidas, tipo y duración de estancia, modelo de
                      atención, servicios profesionales, requisitos,
                      disponibilidad, costos, fotografías y datos sanitarios.
                    </p>
                    <p className="center-verification-date">
                      Última verificación: {c.verifiedAt || "por confirmar"}
                    </p>
                    <div className="center-actions">
                      {phone && <a href={`tel:${phone}`}>Llamar</a>}
                      {whatsapp && (
                        <a
                          className="whatsapp"
                          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, solicito información sobre ${name}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      )}
                      {c.mapsUrl && (
                        <a href={c.mapsUrl} target="_blank" rel="noreferrer">
                          Mapa
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="empty-state">
                <strong>No encontramos centros publicados.</strong>
                <span>
                  Prueba otra búsqueda o registra tu centro para revisión.
                </span>
                <Link className="button button-gold" href="/centros/acceso">
                  Registrar mi centro
                </Link>
              </div>
            )}
          </div>
        </section>
        <section className="care-note">
          <div className="shell">
            <span>EMERGENCIA</span>
            <h2>Un adicto necesita ayuda, no castigo.</h2>
            <p>
              Si existe una emergencia médica, riesgo de suicidio, violencia o
              peligro inmediato para la vida, llama al 911. Este directorio no
              sustituye atención profesional de urgencia.
            </p>
          </div>
        </section>
      </main>
      <SubFooter />
    </>
  );
}
