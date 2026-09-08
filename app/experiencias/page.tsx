import { SubFooter, SubHeader } from "../section-shell";
import { ExperienceCalendar } from "./experience-calendar";

export default function ExperiencesPage() {
  return <><SubHeader label="Experiencias y escrituras" /><main className="experiences-page"><section className="experiences-hero"><div className="shell"><span>CALENDARIO INSTITUCIONAL</span><h1>Una fecha clara también es una forma de cuidar a la comunidad.</h1><p>Selecciona el mes y consulta por zona las experiencias, salas y escrituras confirmadas para 2026, además de las fechas de Unidades 2027.</p></div></section><ExperienceCalendar standalone /></main><SubFooter /></>;
}
