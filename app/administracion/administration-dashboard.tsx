"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SubFooter, SubHeader } from "../section-shell";

type Profile = { email: string; name: string; role: "leader" | "osg" | "delegate" | "council" | "admin"; roleLabel: string; zone: string | null; groupId: number | null };

const roleScope = {
  leader: { title: "Líder", text: "Puede registrar su grupo, consultar el expediente y enviar correcciones o propuestas de actualización." },
  osg: { title: "OSG", text: "Puede apoyar la actualización del grupo asignado y enviar propuestas que requieran revisión." },
  delegate: { title: "Delegado", text: "Puede administrar los grupos de su zona y revisar propuestas dentro de su alcance territorial." },
  council: { title: "Consejo Directivo", text: "Puede revisar cambios sensibles, solicitudes de acceso y registros nuevos de toda la red." },
  admin: { title: "Administración", text: "Puede gestionar directorio, usuarios, contenidos, experiencias y registros institucionales." },
};

export function AdministrationDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/portal/me", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setProfile(data.profile || null); }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <><SubHeader label="Administración" /><main className="administration-hub"><div className="shell panel-loading full-page">Preparando tus facultades de administración…</div></main><SubFooter /></>;
  if (!profile) return <><SubHeader label="Administración" /><main className="administration-hub"><section className="section"><div className="shell"><div className="access-needed"><span>Perfil requerido</span><h1>Tu cuenta todavía no tiene funciones administrativas asignadas.</h1><p>Solicita el perfil que corresponda a tu servicio para continuar.</p><Link className="button button-gold" href="/solicitar-acceso">Solicitar acceso</Link></div></div></section></main><SubFooter /></>;

  const scope = roleScope[profile.role];
  const canReview = ["delegate", "council", "admin"].includes(profile.role);
  const canReviewAccess = ["council", "admin"].includes(profile.role);
  const isAdmin = profile.role === "admin";
  return <><SubHeader label="Administración" /><main className="administration-hub">
    <section className="administration-hero"><div className="shell"><div><span className="eyebrow light">GESTIÓN SEGÚN FACULTADES</span><h1>Actualizar con orden.<br /><em>Decidir con trazabilidad.</em></h1><p>Cada persona ve únicamente las herramientas que corresponden a su servicio y alcance.</p></div><aside><span>PERFIL ACTIVO</span><strong>{scope.title}</strong><p>{profile.zone ? `Zona ${profile.zone}` : "Alcance institucional"}</p></aside></div></section>
    <section className="administration-scope"><div className="shell"><span>LO QUE PUEDES HACER</span><h2>{scope.title}</h2><p>{scope.text}</p></div></section>
    <section className="section administration-actions"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow">Centro de gestión</span><h2>Elige la acción que necesitas.</h2></div><p>Las modificaciones sensibles conservan folio, autor, fecha y estado de revisión.</p></div><div className="administration-card-grid">
      <Link href="/directorio/gestion"><span>01</span><small>DIRECTORIO</small><h3>{canReview ? "Administrar grupos y propuestas" : "Actualizar datos de mi grupo"}</h3><p>{canReview ? "Revisa grupos bajo tu alcance, cambios pendientes y expedientes." : "Corrige datos operativos o envía cambios sensibles a aprobación."}</p><b>Abrir gestión →</b></Link>
      <Link href="/administracion/registrar-grupo"><span>02</span><small>ALTA INSTITUCIONAL</small><h3>Registrar un grupo por primera vez</h3><p>Captura ubicación, responsables, contactos, horarios y canales oficiales.</p><b>Iniciar registro →</b></Link>
      {canReview && <Link href="/administracion/registrar-grupo#revision"><span>03</span><small>REVISIÓN</small><h3>Solicitudes de nuevos grupos</h3><p>Solicita correcciones, aprueba o rechaza registros dentro de tus facultades.</p><b>Revisar solicitudes →</b></Link>}
      {canReviewAccess && <Link href="/directorio/gestion"><span>04</span><small>ACCESOS</small><h3>Solicitudes y usuarios</h3><p>Consulta expedientes de acceso, correcciones y resoluciones del portal.</p><b>Abrir expedientes →</b></Link>}
      {isAdmin && <Link href="/administracion/contenidos"><span>05</span><small>CONTENIDOS</small><h3>Noticias, materiales y testimonios</h3><p>Publica, edita, archiva o elimina contenido institucional.</p><b>Administrar contenido →</b></Link>}
      {isAdmin && <Link href="/administracion/experiencias"><span>06</span><small>PROGRAMACIÓN</small><h3>Experiencias del mes</h3><p>Actualiza fechas, sedes y escrituras disponibles por zona.</p><b>Gestionar experiencias →</b></Link>}
    </div></div></section>
    <section className="administration-rules"><div className="shell"><div><span>CAMBIO DIRECTO</span><h3>Datos operativos</h3><p>Contactos, dirección, mapa, horarios y redes pueden actualizarse según el alcance del perfil.</p></div><div><span>REQUIERE APROBACIÓN</span><h3>Datos sensibles</h3><p>Nombre del grupo, zona, líder y estado institucional conservan revisión antes de publicarse.</p></div><div><span>SIEMPRE REGISTRADO</span><h3>Auditoría</h3><p>Cada alta, modificación y resolución deja un folio para consultar el historial.</p></div></div></section>
  </main><SubFooter /></>;
}
