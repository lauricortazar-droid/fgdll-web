"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type PortalRole = "leader" | "osg" | "delegate" | "council" | "admin";
type DirectoryGroup = {
  id: number; zone: string; name: string; city: string; leaderName: string; subleaderName: string;
  whatsapp: string; email: string; facebook: string; address: string; mapsUrl: string;
  schedules: string; status: string; version: number; updatedAt: string; updatedBy: string;
};
type Profile = { email: string; name: string; role: PortalRole; roleLabel: string; zone: string | null; groupId: number | null };
type Stats = { groups: number; pendingChanges: number; pendingAccess: number };
type ChangeRequest = {
  id: string; groupId: number; groupName: string; groupZone: string; requesterEmail: string;
  requesterName: string; requesterRole: PortalRole; status: string; original: Record<string, unknown>;
  proposal: Record<string, unknown>; requesterNote: string; reviewerEmail: string | null;
  reviewNote: string; createdAt: string;
};
type AccessRequest = {
  id: string; requesterEmail: string; requesterName: string; phone: string; requestedRole: PortalRole;
  zone: string | null; groupName: string; reason: string; status: string; reviewNote: string; createdAt: string;
};

const fieldLabels: Record<string, string> = {
  zone: "Zona", name: "Nombre del grupo", city: "Ciudad", leaderName: "Líder",
  subleaderName: "Sublíder / OSG", whatsapp: "WhatsApp", email: "Correo del grupo",
  facebook: "Facebook", address: "Dirección", mapsUrl: "Enlace de mapa", schedules: "Horarios", status: "Estado",
};
const sensitiveFields = new Set(["zone", "name", "leaderName", "status"]);
const roleLabels: Record<string, string> = { leader: "Líder", osg: "OSG", delegate: "Delegado", council: "Consejo", admin: "Administración" };
const statusLabels: Record<string, string> = {
  pending: "Pendiente", in_review: "En revisión", approved: "Aprobada",
  rejected: "Rechazada", changes_requested: "Solicitaron ajustes",
};

async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

function friendlyDate(value: string) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function displayValue(value: unknown, field?: string) {
  if (field === "status") return value === "active" ? "Activo" : value === "suspended" ? "Suspendido" : value === "closed" ? "Cerrado" : String(value || "Sin dato");
  return String(value ?? "").trim() || "Sin dato";
}

export default function DirectoryManagementPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ groups: 0, pendingChanges: 0, pendingAccess: 0 });
  const [tab, setTab] = useState<"groups" | "changes" | "access">("groups");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<DirectoryGroup | null>(null);
  const [draft, setDraft] = useState<DirectoryGroup | null>(null);
  const [editNote, setEditNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("Todas");

  const canReviewChanges = profile ? ["admin", "council", "delegate"].includes(profile.role) : false;
  const canReviewAccess = profile ? ["admin", "council"].includes(profile.role) : false;
  const zones = useMemo(() => Array.from(new Set(groups.map((group) => group.zone))).sort(), [groups]);
  const filteredGroups = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return groups.filter((group) => {
      const inZone = zoneFilter === "Todas" || group.zone === zoneFilter;
      const haystack = `${group.name} ${group.city} ${group.leaderName} ${group.zone}`.toLocaleLowerCase("es");
      return inZone && (!term || haystack.includes(term));
    });
  }, [groups, search, zoneFilter]);

  async function load(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const me = await fetch("/api/portal/me", { cache: "no-store" }).then(jsonResponse);
      setProfile(me.profile);
      if (!me.profile) {
        setGroups([]);
        return;
      }
      const tasks: Promise<unknown>[] = [fetch("/api/directory/changes", { cache: "no-store" }).then(jsonResponse)];
      if (["admin", "council"].includes(me.profile.role)) tasks.push(fetch("/api/access-requests", { cache: "no-store" }).then(jsonResponse));
      const results = await Promise.all(tasks) as Array<Record<string, unknown>>;
      const directory = results[0] as { groups: DirectoryGroup[]; changes: ChangeRequest[]; stats: Stats };
      setGroups(directory.groups || []);
      setChanges(directory.changes || []);
      setStats(directory.stats || { groups: 0, pendingChanges: 0, pendingAccess: 0 });
      const access = results[1] as { requests?: AccessRequest[] } | undefined;
      setAccessRequests(access?.requests || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el panel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, []);

  function openEditor(group: DirectoryGroup) {
    setEditing(group);
    setDraft({ ...group });
    setEditNote("");
    setNotice("");
  }

  function updateDraft(field: keyof DirectoryGroup, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  async function submitChange(event: FormEvent) {
    event.preventDefault();
    if (!editing || !draft) return;
    setBusy("edit");
    setError("");
    try {
      const proposal = Object.fromEntries(Object.keys(fieldLabels).map((field) => [field, draft[field as keyof DirectoryGroup]]));
      const result = await fetch("/api/directory/changes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: editing.id, proposal, note: editNote }),
      }).then(jsonResponse);
      setEditing(null);
      setDraft(null);
      setNotice(result.requiresApproval
        ? `Cambio enviado con el folio ${result.id}. Quedó pendiente de aprobación.`
        : `Directorio actualizado. Folio de control: ${result.id}.`);
      await load(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible enviar el cambio.");
    } finally {
      setBusy("");
    }
  }

  async function review(kind: "directory" | "access", id: string, action: "approve" | "reject" | "request_changes") {
    setBusy(`${kind}-${id}-${action}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(kind === "directory" ? "/api/directory/changes" : "/api/access-requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action, note: reviewNotes[id] || "" }),
      }).then(jsonResponse);
      setNotice(`${id}: ${statusLabels[response.status]?.toLocaleLowerCase("es") || "revisión guardada"}.`);
      await load(false);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "No fue posible guardar la revisión.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <><SubHeader label="Gestión del directorio" /><main className="directory-admin"><div className="shell panel-loading full-page">Abriendo el panel institucional…</div></main><SubFooter /></>;

  if (!profile) return <><SubHeader label="Gestión del directorio" /><main className="directory-admin"><section className="section"><div className="shell"><div className="access-needed"><span>Acceso pendiente</span><h1>Tu cuenta todavía no tiene un perfil activo.</h1><p>Solicita la función y el alcance que te corresponden para entrar a esta sección.</p><Link className="button button-gold" href="/solicitar-acceso">Solicitar acceso</Link></div></div></section></main><SubFooter /></>;

  const changedSensitive = editing && draft ? Array.from(sensitiveFields).some((field) => displayValue(editing[field as keyof DirectoryGroup]) !== displayValue(draft[field as keyof DirectoryGroup])) : false;
  const needsApproval = profile.role === "leader" || profile.role === "osg" || (profile.role === "delegate" && changedSensitive);

  return <>
    <SubHeader label="Gestión del directorio" />
    <main className="directory-admin">
      <section className="admin-hero"><div className="shell admin-hero-grid"><div><span className="eyebrow light">Directorio nacional</span><h1>Actualiza la red con orden y trazabilidad.</h1><p>Edita los datos dentro de tu alcance. Cada movimiento queda identificado por usuario, fecha y folio.</p></div><aside><span className="role-badge">{profile.roleLabel}</span><strong>{profile.name}</strong><small>{profile.email}</small>{profile.zone && <p>Zona {profile.zone}</p>}</aside></div></section>
      <section className="admin-strip"><div className="shell"><span><b>Regla activa</b>{profile.role === "leader" || profile.role === "osg" ? "Tus cambios pasan a aprobación." : profile.role === "delegate" ? "Datos operativos se publican; nombre, zona, líder y estado pasan a Consejo." : "Puedes actualizar y aprobar cambios."}</span><a href="mailto:admin@fgdll.org">Soporte: admin@fgdll.org</a></div></section>
      <section className="admin-workspace"><div className="shell">
        <div className="stats-grid"><article><span>Grupos bajo tu alcance</span><strong>{stats.groups}</strong></article><article><span>Cambios pendientes</span><strong>{stats.pendingChanges}</strong></article>{canReviewAccess && <article><span>Accesos pendientes</span><strong>{stats.pendingAccess}</strong></article>}<article className="stat-action"><span>Directorio público</span><Link href="/#directorio">Ver publicación ↗</Link></article></div>
        {(error || notice) && <div className={`panel-alert ${error ? "error" : "ok"}`}><span>{error ? "!" : "✓"}</span><p>{error || notice}</p><button onClick={() => { setError(""); setNotice(""); }} aria-label="Cerrar aviso">×</button></div>}
        <div className="panel-tabs" role="tablist"><button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>Mis grupos <b>{stats.groups}</b></button><button className={tab === "changes" ? "active" : ""} onClick={() => setTab("changes")}>Cambios <b>{changes.length}</b></button>{canReviewAccess && <button className={tab === "access" ? "active" : ""} onClick={() => setTab("access")}>Solicitudes de acceso <b>{stats.pendingAccess}</b></button>}</div>

        {tab === "groups" && <section className="panel-section"><div className="panel-section-head"><div><span>DIRECTORIO</span><h2>Información de grupos</h2></div><p>Busca, revisa y abre un registro para actualizarlo.</p></div><div className="panel-filters"><label><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo, ciudad o líder…" /></label><select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}><option>Todas</option>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></div><div className="managed-group-grid">{filteredGroups.map((group) => <article key={group.id}><div className="managed-group-top"><span>{group.zone}</span><small className={`group-status ${group.status}`}>{displayValue(group.status, "status")}</small></div><h3>{group.name}</h3><p>{group.city || "Ciudad sin registrar"}</p><dl><div><dt>Líder</dt><dd>{group.leaderName || "Sin registrar"}</dd></div><div><dt>WhatsApp</dt><dd>{group.whatsapp || "Sin registrar"}</dd></div></dl><footer><small>Versión {group.version}</small><button onClick={() => openEditor(group)}>Editar datos <span>→</span></button></footer></article>)}</div>{!filteredGroups.length && <div className="empty-panel"><span>⌕</span><p>No hay grupos que coincidan con la búsqueda.</p></div>}</section>}

        {tab === "changes" && <section className="panel-section"><div className="panel-section-head"><div><span>TRAZABILIDAD</span><h2>Solicitudes de cambio</h2></div><p>{canReviewChanges ? "Compara la información y registra una decisión." : "Consulta el avance de los cambios que has enviado."}</p></div><div className="review-list">{changes.map((change) => {
          const fields = Object.keys(change.proposal);
          const hasSensitive = fields.some((field) => sensitiveFields.has(field));
          const delegateCannotApprove = profile.role === "delegate" && hasSensitive;
          const open = change.status === "pending" || change.status === "in_review";
          return <article className="review-card" key={change.id}><header><div><span>{change.id}</span><h3>{change.groupName}</h3><p>Zona {change.groupZone} · {friendlyDate(change.createdAt)}</p></div><span className={`status-pill status-${change.status}`}>{statusLabels[change.status] || change.status}</span></header><div className="requester-line"><span>Solicitó</span><strong>{change.requesterName || change.requesterEmail}</strong><small>{roleLabels[change.requesterRole]} · {change.requesterEmail}</small></div><div className="diff-list">{fields.map((field) => <div key={field} className={sensitiveFields.has(field) ? "sensitive" : ""}><span>{fieldLabels[field] || field}{sensitiveFields.has(field) && <b>Consejo</b>}</span><p><del>{displayValue(change.original[field], field)}</del><ins>{displayValue(change.proposal[field], field)}</ins></p></div>)}</div>{change.requesterNote && <blockquote><b>Nota de quien solicita:</b> {change.requesterNote}</blockquote>}{change.reviewNote && <blockquote className="review-note"><b>Resolución:</b> {change.reviewNote}</blockquote>}{canReviewChanges && open && <div className="review-actions"><label><span>Nota de revisión</span><textarea value={reviewNotes[change.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [change.id]: event.target.value }))} rows={2} placeholder="Opcional al aprobar; necesaria si solicitas ajustes." /></label>{delegateCannotApprove && <p className="escalation-note">Este cambio incluye datos sensibles y debe aprobarlo Consejo o administración.</p>}<div><button className="review-approve" disabled={delegateCannotApprove || Boolean(busy)} onClick={() => review("directory", change.id, "approve")}>{busy === `directory-${change.id}-approve` ? "Guardando…" : "Aprobar"}</button><button disabled={Boolean(busy)} onClick={() => review("directory", change.id, "request_changes")}>Solicitar ajustes</button><button className="review-reject" disabled={Boolean(busy)} onClick={() => review("directory", change.id, "reject")}>Rechazar</button></div></div>}</article>;
        })}</div>{!changes.length && <div className="empty-panel"><span>✓</span><p>Todavía no hay solicitudes de cambio.</p></div>}</section>}

        {tab === "access" && canReviewAccess && <section className="panel-section"><div className="panel-section-head"><div><span>ACCESOS</span><h2>Solicitudes de usuarios</h2></div><p>Valida identidad, función y alcance antes de activar un perfil.</p></div><div className="review-list">{accessRequests.map((request) => {
          const open = request.status === "pending" || request.status === "in_review";
          return <article className="review-card access-review" key={request.id}><header><div><span>{request.id}</span><h3>{request.requesterName}</h3><p>{friendlyDate(request.createdAt)}</p></div><span className={`status-pill status-${request.status}`}>{statusLabels[request.status] || request.status}</span></header><div className="access-facts"><div><span>Cuenta</span><strong>{request.requesterEmail}</strong></div><div><span>Perfil</span><strong>{roleLabels[request.requestedRole] || request.requestedRole}</strong></div><div><span>Alcance</span><strong>{request.groupName || (request.zone ? `Zona ${request.zone}` : "Institucional")}</strong></div><div><span>Contacto</span><strong>{request.phone || "Sin teléfono"}</strong></div></div>{request.reason && <blockquote><b>Información de validación:</b> {request.reason}</blockquote>}{request.reviewNote && <blockquote className="review-note"><b>Resolución:</b> {request.reviewNote}</blockquote>}{open && <div className="review-actions"><label><span>Nota de revisión</span><textarea value={reviewNotes[request.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} placeholder="Registra cualquier aclaración o requisito." /></label><div><button className="review-approve" disabled={Boolean(busy)} onClick={() => review("access", request.id, "approve")}>{busy === `access-${request.id}-approve` ? "Activando…" : "Aprobar y activar"}</button><button disabled={Boolean(busy)} onClick={() => review("access", request.id, "request_changes")}>Solicitar información</button><button className="review-reject" disabled={Boolean(busy)} onClick={() => review("access", request.id, "reject")}>Rechazar</button></div></div>}</article>;
        })}</div>{!accessRequests.length && <div className="empty-panel"><span>✓</span><p>No hay solicitudes de acceso registradas.</p></div>}</section>}
      </div></section>
    </main>

    {editing && draft && <div className="editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title"><header><div><span>EDITAR DIRECTORIO</span><h2 id="editor-title">{editing.name}</h2><p>Zona {editing.zone} · versión {editing.version}</p></div><button onClick={() => setEditing(null)} aria-label="Cerrar editor">×</button></header><form onSubmit={submitChange}><div className="editor-body"><div className="editor-guidance"><span>Cómo se publicará</span><p>{needsApproval ? "Al guardar, se creará una solicitud para aprobación antes de modificar el directorio público." : "Al guardar, el directorio se actualizará inmediatamente y quedará un folio de auditoría."}</p>{changedSensitive && <strong>Incluiste un dato sensible: requiere revisión de Consejo o administración.</strong>}</div><div className="editor-grid"><label className="sensitive-field"><span>Nombre del grupo <b>Consejo</b></span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required /></label><label className="sensitive-field"><span>Zona <b>Consejo</b></span><select value={draft.zone} onChange={(event) => updateDraft("zone", event.target.value)} required>{["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"].map((zone) => <option key={zone}>{zone}</option>)}</select></label><label><span>Ciudad</span><input value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} /></label><label className="sensitive-field"><span>Líder <b>Consejo</b></span><input value={draft.leaderName} onChange={(event) => updateDraft("leaderName", event.target.value)} /></label><label><span>Sublíder / OSG</span><input value={draft.subleaderName} onChange={(event) => updateDraft("subleaderName", event.target.value)} /></label><label><span>WhatsApp</span><input value={draft.whatsapp} onChange={(event) => updateDraft("whatsapp", event.target.value)} inputMode="tel" /></label><label><span>Correo del grupo</span><input value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} type="email" /></label><label><span>Facebook</span><input value={draft.facebook} onChange={(event) => updateDraft("facebook", event.target.value)} placeholder="https://facebook.com/…" /></label><label className="wide"><span>Dirección</span><textarea value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} rows={2} /></label><label className="wide"><span>Enlace de Google Maps</span><input value={draft.mapsUrl} onChange={(event) => updateDraft("mapsUrl", event.target.value)} placeholder="https://maps.google.com/…" /></label><label className="wide"><span>Días y horarios</span><textarea value={draft.schedules} onChange={(event) => updateDraft("schedules", event.target.value)} rows={3} placeholder="Ej. Lunes a viernes, 20:00 h" /></label><label className="sensitive-field"><span>Estado <b>Consejo</b></span><select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="closed">Cerrado</option></select></label><label className="wide"><span>Motivo o contexto del cambio</span><textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} rows={3} placeholder="Ayuda a quien revise a entender por qué se necesita el cambio." /></label></div></div><footer><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-gold" disabled={busy === "edit"}>{busy === "edit" ? "Guardando…" : needsApproval ? "Enviar a aprobación" : "Guardar y publicar"}</button></footer></form></section></div>}
    <SubFooter />
  </>;
}
