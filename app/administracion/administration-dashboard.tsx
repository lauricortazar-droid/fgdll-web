"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SubFooter, SubHeader } from "../section-shell";

type Profile = { email: string; name: string; role: "leader" | "osg" | "delegate" | "director" | "council" | "admin"; roleLabel: string; zone: string | null; groupId: number | null; centerId: number | null };

const roleScope = {
  leader: { title: "Líder", text: "Puede registrar su grupo, consultar el expediente y enviar correcciones o propuestas de actualización." },
  osg: { title: "OSG", text: "Puede apoyar la actualización del grupo asignado y enviar propuestas que requieran revisión." },
  delegate: { title: "Delegado", text: "Puede administrar los grupos de su zona y revisar propuestas dentro de su alcance territorial." },
  director: { title: "Director de centro", text: "Puede mantener la ficha de su centro y enviar cambios para aprobación administrativa." },
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
      {isAdmin && <Link href="/administracion/centros"><span>07</span><small>CENTROS</small><h3>Aprobar centros y modificaciones</h3><p>Revisa altas y cambios antes de publicarlos en el directorio.</p><b>Abrir solicitudes →</b></Link>}
      {isAdmin && <Link href="/oraculo"><span>08</span><small>HERRAMIENTA PRIVADA</small><h3>El Oráculo</h3><p>Genera lecturas de tarot y horóscopo dentro del acceso exclusivo de Administración.</p><b>Abrir Oráculo →</b></Link>}
      {isAdmin && <Link href="/administracion/orientacion"><span>09</span><small>ORIENTACIÓN</small><h3>Solicitudes de familias</h3><p>Contacta, orienta, canaliza y registra notas privadas de seguimiento.</p><b>Abrir solicitudes →</b></Link>}
      {isAdmin && <Link href="/administracion/etica"><span>10</span><small>ÉTICA</small><h3>Reportes confidenciales</h3><p>Clasifica expedientes, documenta notas privadas y publica avances de seguimiento.</p><b>Gestionar reportes →</b></Link>}
      {isAdmin && <Link href="/administracion/universidad"><span>11</span><small>UNIVERSIDAD</small><h3>Usuarios y reconocimientos</h3><p>Agrega usuarios por correo y revisa inscripciones, centros y solicitudes.</p><b>Administrar Universidad →</b></Link>}
    </div></div></section>
    {isAdmin && <section className="section operations-center"><div className="shell"><div className="section-heading split-heading"><div><span className="eyebrow light">FGDLL — Sistema Institucional</span><h2>El centro de operaciones, organizado por responsabilidad.</h2></div><p>Esta vista reúne la estructura que después puede mantenerse desde ChatGPT Work sin mezclarla con la experiencia pública.</p></div><div className="operations-grid">
      <article><span>01</span><h3>Dirección y Consejo</h3><p>Gobernanza, decisiones, organigrama y políticas.</p></article>
      <Link href="/directorio/gestion"><span>02</span><h3>Directorio Nacional</h3><p>Grupos, zonas, verificaciones y cambios.</p></Link>
      <Link href="/portal"><span>03</span><h3>Liderazgo</h3><p>Manuales, avisos, Universidad y recursos.</p></Link>
      <Link href="/#agenda"><span>04</span><h3>Agenda Nacional</h3><p>Experiencias, aniversarios y actividades.</p></Link>
      <Link href="/centros"><span>05</span><h3>Centros</h3><p>Directorio y atención residencial.</p></Link>
      <Link href="/etica"><span>06</span><h3>Ética y Educación</h3><p>Derechos, protocolos y formación ética.</p></Link>
      <Link href="/administracion/contenidos"><span>07</span><h3>Comunicación</h3><p>Comunicados, campañas y materiales.</p></Link>
      <Link href="/administracion"><span>08</span><h3>Administración</h3><p>Altas, bajas, correcciones y seguimiento.</p></Link>
      <Link href="/"><span>09</span><h3>Portal FGDLL</h3><p>Contenido público y publicación institucional.</p></Link>
      <article><span>10</span><h3>Archivo Institucional</h3><p>Versiones anteriores e historia documental.</p></article>
    </div></div></section>}
    <section className="administration-rules"><div className="shell"><div><span>CAMBIO DIRECTO</span><h3>Datos operativos</h3><p>Contactos, dirección, mapa, horarios y redes pueden actualizarse según el alcance del perfil.</p></div><div><span>REQUIERE APROBACIÓN</span><h3>Datos sensibles</h3><p>Nombre del grupo, zona, líder y estado institucional conservan revisión antes de publicarse.</p></div><div><span>SIEMPRE REGISTRADO</span><h3>Auditoría</h3><p>Cada alta, modificación y resolución deja un folio para consultar el historial.</p></div></div></section>
  </main><SubFooter /></>;
}
