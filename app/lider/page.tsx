"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { SubFooter, SubHeader } from "../section-shell";

type Profile = { name: string; email: string; role: string; roleLabel: string; zone: string | null; groupId: number | null } | null;

const options = [
  { title: "Acceder", text: "Volver al portal general.", href: "/portal" },
  { title: "Avisos", text: "Leer comunicados publicados.", href: "/portal#avisos" },
  { title: "Materiales", text: "Abrir documentos y manuales.", href: "/portal#materiales" },
  { title: "Testimonios", text: "Consultar la lista de testimonios.", href: "/testimonios" },
  { title: "Actualizar datos de mi grupo", text: "Enviar cambios del directorio.", href: "/directorio/gestion" },
  { title: "Mi grupo", text: "Revisar ficha pública y datos de contacto.", href: "/directorio/gestion" },
];

async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

function fields(event: FormEvent<HTMLFormElement>) {
  return Object.fromEntries(new FormData(event.currentTarget).entries());
}

export default function LiderPage() {
  const [profile, setProfile] = useState<Profile>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/portal/me", { cache: "no-store" })
      .then(jsonResponse)
      .then((data) => { if (active) setProfile(data.profile ?? null); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, kind: string, build: (data: Record<string, FormDataEntryValue>) => Record<string, unknown>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = build(fields(event));
    setBusy(kind);
    setMessage("");
    setError("");
    try {
      const result = await fetch("/api/leader/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(jsonResponse);
      form.reset();
      setMessage(`Registro enviado con folio ${result.id}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible enviar el registro.");
    } finally {
      setBusy("");
    }
  }

  return <>
    <SubHeader label="Líderes" />
    <main className="leader-page">
      <section className="leader-hero">
        <div className="shell leader-hero-grid">
          <div><span className="eyebrow light">Portal del líder</span><h1>Opciones para cuidar, actualizar y coordinar.</h1><p>Accesos rápidos, reportes identificados, solicitud de lonas y registro operativo de padrinos o coordinadores.</p></div>
          <aside><span>PERFIL</span><strong>{profile?.roleLabel || "Usuario activo"}</strong><small>{profile?.name || profile?.email || "Portal FGDLL"}</small>{profile?.zone && <p>Zona {profile.zone}</p>}</aside>
        </div>
      </section>

      <section className="section leader-options"><div className="shell">
        <div className="section-heading split-heading"><div><span className="eyebrow">Accesos</span><h2>Lo que puede mirar un líder.</h2></div><p>Todo queda concentrado sin meter trámites donde solo necesitas consultar.</p></div>
        <div className="leader-option-grid">{options.map((item, index) => <Link key={item.title} href={item.href}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.text}</p><b>Abrir →</b></Link>)}</div>
      </div></section>

      <section className="section leader-forms" id="reportes"><div className="shell leader-form-grid">
        <div><span className="eyebrow">Reportes</span><h2>Reporte identificado.</h2><p>Este formulario no es anónimo. Tu cuenta queda ligada al folio para que administración pueda dar seguimiento.</p>{message && <div className="form-message ok">{message}</div>}{error && <div className="form-message error">{error}</div>}</div>
        <form className="report-form" onSubmit={(event) => submit(event, "report", (data) => ({ ...data, category: data.category || "operacion" }))}>
          <label>Categoría<select name="category" defaultValue="operacion"><option value="operacion">Operación</option><option value="integridad">Integridad</option><option value="finanzas">Finanzas</option><option value="seguridad">Seguridad</option><option value="acompanamiento">Acompañamiento</option></select></label>
          <div className="report-form-row"><label>Zona o grupo<input name="groupZone" maxLength={180} /></label><label>Fecha aproximada<input name="approximateDate" type="date" /></label></div>
          <label>Relato<textarea name="narrative" required minLength={30} maxLength={10000} rows={6} /></label>
          <label>Personas involucradas o testigos<textarea name="peopleOrWitnesses" maxLength={3000} rows={3} /></label>
          <label>Seguimiento<select name="supportNeeded" defaultValue="Seguimiento operativo"><option>Orientación</option><option>Protección inmediata</option><option>Revisión institucional</option><option>Seguimiento operativo</option></select></label>
          <label>Teléfono / WhatsApp<input name="phone" type="tel" inputMode="tel" /></label>
          <button className="button button-gold" disabled={busy === "report"}>{busy === "report" ? "Enviando…" : "Enviar reporte"}</button>
        </form>
      </div></section>

      <section className="section leader-requests"><div className="shell leader-request-grid">
        <form className="report-form" onSubmit={(event) => submit(event, "lona", (data) => ({ category: "operacion", supportNeeded: "Seguimiento operativo", phone: data.phone, groupZone: data.groupZone, narrative: `Solicitud de lonas. Medida/cantidad: ${data.size}. Uso: ${data.use}. Dirección o entrega: ${data.delivery}`, peopleOrWitnesses: "" }))}>
          <h3>Solicitud de lonas</h3><label>Grupo o zona<input name="groupZone" required /></label><label>Medida y cantidad<input name="size" required placeholder="Ej. 2 lonas de 2 x 1 m" /></label><label>Uso<textarea name="use" required rows={3} /></label><label>Entrega o dirección<textarea name="delivery" rows={3} /></label><label>Teléfono / WhatsApp<input name="phone" type="tel" inputMode="tel" /></label><button className="button button-gold" disabled={busy === "lona"}>{busy === "lona" ? "Enviando…" : "Solicitar lona"}</button>
        </form>
        <form className="report-form" onSubmit={(event) => submit(event, "equipo", (data) => ({ category: "acompanamiento", supportNeeded: "Seguimiento operativo", phone: data.phone, groupZone: data.groupZone, narrative: `Registro de padrinos y coordinadores. Padrinos: ${data.sponsors}. Coordinadores: ${data.coordinators}. Notas: ${data.notes}`, peopleOrWitnesses: `${data.sponsors}\n${data.coordinators}` }))}>
          <h3>Padrinos y coordinadores</h3><label>Grupo<input name="groupZone" required /></label><label>Padrinos<textarea name="sponsors" rows={4} placeholder="Un nombre por línea" /></label><label>Coordinadores<textarea name="coordinators" rows={4} placeholder="Un nombre por línea" /></label><label>Notas<textarea name="notes" rows={3} /></label><label>Teléfono / WhatsApp<input name="phone" type="tel" inputMode="tel" /></label><button className="button button-gold" disabled={busy === "equipo"}>{busy === "equipo" ? "Enviando…" : "Registrar equipo"}</button>
        </form>
      </div></section>

      <section className="leader-affiliation"><div className="shell"><span>AFILIACIÓN</span><h2>Grupo oficial de Guerreros de la Luz.</h2><p>Este espacio queda reservado para el registro formal de datos y dirección de afiliación.</p></div></section>
    </main>
    <SubFooter />
  </>;
}
