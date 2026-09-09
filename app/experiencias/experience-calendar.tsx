"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import initialExperienceData from "../monthly-experiences-data.json";
import { zoneMeta } from "../public-directory";

type MonthlyExperience = {
  id: string; month: string; zone: string; title: string; startDate: string; endDate: string;
  location: string; writings: string[]; notes: string; status: string;
};

const initialExperiences = initialExperienceData as MonthlyExperience[];
const zoneNames = Object.keys(zoneMeta);

function dateFromYmd(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" }).format(dateFromYmd(value)).replace(".", "");
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function experienceDate(item: MonthlyExperience) {
  const startDay = Number(item.startDate.slice(8, 10));
  const endDay = Number(item.endDate.slice(8, 10));
  if (item.startDate === item.endDate) return `${startDay} de ${shortMonth(item.startDate)}`;
  if (item.startDate.slice(0, 7) === item.endDate.slice(0, 7)) return `${startDay}–${endDay} de ${shortMonth(item.startDate)}`;
  return `${startDay} de ${shortMonth(item.startDate)} – ${endDay} de ${shortMonth(item.endDate)}`;
}

function closestMonth(months: string[]) {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return months.find((month) => month >= current) || months.at(-1) || "";
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ExperienceCalendar({ standalone = false }: { standalone?: boolean }) {
  const [items, setItems] = useState(initialExperiences);
  const months = useMemo(() => Array.from(new Set(items.map((item) => item.month).filter((month) => month >= currentMonthKey()))).sort(), [items]);
  const [activeMonth, setActiveMonth] = useState(() => closestMonth(Array.from(new Set(initialExperiences.map((item) => item.month))).sort()));

  useEffect(() => {
    let active = true;
    fetch("/api/monthly-experiences", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => { if (active && Array.isArray(result.experiences) && result.experiences.length) setItems(result.experiences); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (months.length && !months.includes(activeMonth)) setActiveMonth(closestMonth(months));
  }, [months, activeMonth]);

  const monthItems = items.filter((item) => item.month === activeMonth);
  return <section className="section monthly-experiences" id="experiencias"><div className="shell">
    <div className="section-heading split-heading monthly-experience-heading"><div><span className="eyebrow light">Experiencias y escrituras</span><h2>{standalone ? "Calendario anual por zonas." : "Cada zona, su fecha, salas y escrituras."}</h2></div><div className="experience-heading-actions"><p>Consulta las fechas confirmadas y lo que estará disponible en cada experiencia.</p>{!standalone && <Link href="/experiencias">Ver calendario completo →</Link>}</div></div>
    <div className="experience-month-tabs" role="tablist" aria-label="Meses de experiencias">{months.map((month) => <button key={month} type="button" role="tab" aria-selected={activeMonth === month} className={activeMonth === month ? "active" : ""} onClick={() => setActiveMonth(month)}>{monthLabel(month)}</button>)}</div>
    <div className="experience-zone-grid" role="tabpanel">{zoneNames.map((zone, index) => {
      const zoneItems = monthItems.filter((item) => item.zone === zone);
      return <article className={`experience-zone-card experience-zone-${index + 1}`} key={zone}><header><span>{zoneMeta[zone].icon}</span><div><small>ZONA</small><h3>{zone}</h3></div></header>{zoneItems.length ? zoneItems.map((item) => <div className="experience-entry" key={item.id}><div className="experience-date"><span>FECHA</span><strong>{experienceDate(item)}</strong></div><h4>{item.title}</h4>{item.location && <p className="experience-location">⌖ {item.location}</p>}<div className="writing-block"><span>SALAS Y ESCRITURAS DISPONIBLES</span><div>{item.writings.length ? item.writings.map((writing) => <b key={writing}>{writing}</b>) : <em>Por confirmar</em>}</div></div>{item.notes && <p className="experience-note">{item.notes}</p>}</div>) : <div className="experience-empty"><span>—</span><strong>Sin experiencia publicada</strong><p>La fecha aparecerá cuando sea confirmada.</p></div>}</article>;
    })}</div>
  </div></section>;
}
