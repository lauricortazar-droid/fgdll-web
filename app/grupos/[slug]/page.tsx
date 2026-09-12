"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import calendarData from "../../calendar-data.json";
import publicData from "../../public-directory-data.json";
import { groupHref, type PublicGroup, verificationLabel, whatsappHref, zoneHref, zoneMeta } from "../../public-directory";
import { SubFooter, SubHeader } from "../../section-shell";

type CalendarEvent = { id: string; title: string; start: string; end: string; location: string | null; url: string | null };

function friendlyDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export default function GroupPage() {
  const params = useParams<{ slug: string }>();
  const id = Number(String(params.slug).match(/-(\d+)$/)?.[1]);
  const fallback = (publicData.grupos as PublicGroup[]).find((item) => item.id === id) ?? null;
  const [groups, setGroups] = useState<PublicGroup[]>(publicData.grupos as PublicGroup[]);
  const group = groups.find((item) => item.id === id) ?? fallback;

  useEffect(() => {
    let active = true;
    fetch("/api/directory", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => { if (active && Array.isArray(result.groups)) setGroups(result.groups); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const related = useMemo(() => group ? groups.filter((item) => item.zone === group.zone && item.id !== group.id).slice(0, 3) : [], [group, groups]);
  const activities = useMemo(() => group ? (calendarData as CalendarEvent[]).filter((event) => `${event.title} ${event.location ?? ""}`.toLocaleLowerCase("es").includes(group.name.toLocaleLowerCase("es"))).slice(0, 3) : [], [group]);

  if (!group) return <><SubHeader label="Directorio" /><main className="group-detail-page"><section className="section"><div className="shell empty-state"><strong>No encontramos este grupo.</strong><span>El enlace puede haber cambiado o el grupo ya no está publicado.</span><Link className="button button-gold" href="/#directorio">Volver al directorio</Link></div></section></main><SubFooter /></>;

  return <><SubHeader label="Directorio público" /><main className="group-detail-page">
    <section className="group-detail-hero"><div className="shell"><div className="group-detail-title"><span className="zone-badge"><b>{zoneMeta[group.zone]?.icon}</b> Zona {group.zone}</span><small>{group.publicCode}</small><h1>{group.name}</h1><p>{group.city || "Ubicación por confirmar"}</p><div className={`verification ${group.verifiedAt ? "verified" : "pending"}`}><i />{verificationLabel(group.verifiedAt)}</div></div><aside><span>CONTACTO PÚBLICO</span><h2>¿Quieres asistir?</h2><p>Confirma primero el horario y la dirección. Indica que es tu primera visita para que puedan orientarte.</p>{group.whatsapp && <a className="button button-gold" href={whatsappHref(group.whatsapp)} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>}</aside></div></section>

    <section className="section group-detail-body"><div className="shell group-detail-grid"><div className="group-facts"><article><span>JUNTAS</span><strong>{group.schedules || "Horario por confirmar"}</strong></article><article><span>DIRECCIÓN</span><strong>{group.address || "Dirección por confirmar"}</strong>{group.mapsUrl && <a href={group.mapsUrl} target="_blank" rel="noreferrer">Abrir cómo llegar →</a>}</article>{group.sessionTypes && <article><span>TIPOS DE SESIÓN</span><strong>{group.sessionTypes}</strong></article>}{group.facebook && <article><span>RED OFICIAL</span><a href={group.facebook} target="_blank" rel="noreferrer">Visitar Facebook →</a></article>}</div><aside className="arrival-card"><span>ANTES DE IR</span><h2>Tu primera visita, paso a paso.</h2><ol><li><b>1</b>Confirma por WhatsApp.</li><li><b>2</b>Llega unos minutos antes.</li><li><b>3</b>Pregunta por la persona responsable.</li><li><b>4</b>Escucha; no tienes que contar todo hoy.</li></ol><p>FGDLL brinda acompañamiento comunitario. No sustituye atención médica, psicológica o de emergencia.</p></aside></div></section>

    {activities.length > 0 && <section className="section group-activities"><div className="shell"><div className="section-heading"><span className="eyebrow">Próximas actividades</span><h2>Lo que viene para {group.name}.</h2></div><div className="simple-event-grid">{activities.map((event) => <article key={event.id}><span>{friendlyDate(event.start.slice(0, 10))}</span><h3>{event.title}</h3>{event.location && <p>{event.location}</p>}{event.url && <a href={event.url} target="_blank" rel="noreferrer">Abrir evento →</a>}</article>)}</div></div></section>}

    <section className="section related-groups"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">También en Zona {group.zone}</span><h2>Otros grupos que pueden acompañarte.</h2></div><Link className="button button-outline" href={zoneHref(group.zone)}>Ver toda la zona</Link></div><div className="related-grid">{related.map((item) => <Link href={groupHref(item)} key={item.id}><small>{item.publicCode}</small><h3>{item.name}</h3><p>{item.city}</p><span>Ver información →</span></Link>)}</div></div></section>
  </main><SubFooter /></>;
}
