"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import experienceData from "../../monthly-experiences-data.json";
import publicData from "../../public-directory-data.json";
import { groupHref, slugify, type PublicGroup, verificationLabel, whatsappHref, zoneMeta } from "../../public-directory";
import { SubFooter, SubHeader } from "../../section-shell";

type Experience = { id: string; month: string; zone: string; title: string; startDate: string; endDate: string; location: string; writings: string[] };

export default function ZonePage() {
  const params = useParams<{ zona: string }>();
  const zone = Object.keys(zoneMeta).find((item) => slugify(item) === params.zona);
  const [groups, setGroups] = useState<PublicGroup[]>(publicData.grupos as PublicGroup[]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/directory", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => { if (active && Array.isArray(result.groups)) setGroups(result.groups); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const zoneGroups = useMemo(() => groups.filter((item) => item.zone === zone && `${item.name} ${item.city} ${item.address}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))), [groups, query, zone]);
  const experiences = (experienceData as Experience[]).filter((item) => item.zone === zone);

  if (!zone) return <><SubHeader label="Zonas" /><main><section className="section"><div className="shell empty-state"><strong>Esta zona no existe.</strong><Link className="button button-gold" href="/#mapa">Ver zonas FGDLL</Link></div></section></main><SubFooter /></>;

  return <><SubHeader label={`Zona ${zone}`} /><main className="zone-page">
    <section className={`zone-page-hero zone-theme-${Object.keys(zoneMeta).indexOf(zone) + 1}`}><div className="shell"><span className="zone-page-letter">{zoneMeta[zone].icon}</span><div><span>ZONA FGDLL</span><h1>{zone}</h1><p>{zoneMeta[zone].line} · {groups.filter((item) => item.zone === zone).length} grupos publicados</p></div><Link className="button button-ghost" href="/#mapa">Ver mapa nacional</Link></div></section>

    <section className="section zone-directory"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Grupos de la zona</span><h2>Encuentra dónde comenzar.</h2></div><label className="zone-search"><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Grupo, ciudad o colonia" /></label></div><div className="directory-grid">{zoneGroups.map((group) => <article className="group-card public-group-card" key={group.id}><div className="group-top"><span className="zone-dot">{zoneMeta[zone].icon}</span><span>Zona {zone}</span><small>{group.publicCode}</small></div><h3>{group.name}</h3><p className="location">{group.city}</p><dl>{group.schedules && <div><dt>Juntas</dt><dd>{group.schedules}</dd></div>}{group.address && <div><dt>Dirección</dt><dd>{group.address}</dd></div>}</dl><div className={`verification ${group.verifiedAt ? "verified" : "pending"}`}><i />{verificationLabel(group.verifiedAt)}</div><div className="card-actions primary-actions">{group.whatsapp && <a href={whatsappHref(group.whatsapp)} target="_blank" rel="noreferrer">WhatsApp</a>}{group.mapsUrl && <a href={group.mapsUrl} target="_blank" rel="noreferrer">Cómo llegar</a>}<Link href={groupHref(group)}>Ver grupo</Link></div></article>)}</div>{!zoneGroups.length && <div className="empty-state"><strong>No encontramos coincidencias.</strong><span>Prueba con otro nombre o ciudad.</span></div>}</div></section>

    <section className="section zone-experiences"><div className="shell"><div className="section-heading"><span className="eyebrow light">Experiencias de Zona {zone}</span><h2>Fechas y escrituras publicadas.</h2></div><div className="simple-event-grid">{experiences.map((item) => <article key={item.id}><span>{item.startDate === item.endDate ? item.startDate : `${item.startDate} — ${item.endDate}`}</span><h3>{item.title}</h3><p>{item.location || "Sede por confirmar"}</p><div>{item.writings.map((writing) => <b key={writing}>{writing}</b>)}</div></article>)}{!experiences.length && <div className="empty-panel"><p>Todavía no hay una experiencia publicada para esta zona.</p></div>}</div></div></section>
  </main><SubFooter /></>;
}
