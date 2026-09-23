"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SubFooter, SubHeader } from "../../section-shell";

type PortalRole = "member" | "leader" | "osg" | "delegate" | "council" | "admin";
type DirectoryGroup = {
  id: number; zone: string; name: string; city: string; leaderName: string; subleaderName: string;
  whatsapp: string; email: string; facebook: string; address: string; mapsUrl: string;
  schedules: string; sessionTypes: string; status: string; version: number; verifiedAt: string | null; updatedAt: string; updatedBy: string;
};
type Profile = { email: string; name: string; role: PortalRole; roleLabel: string; zone: string | null; groupId: number | null };
type Stats = { groups: number; verified: number; unverified: number; pendingChanges: number; pendingAccess: number };
type ChangeRequest = {
  id: string; groupId: number; groupName: string; groupZone: string; requesterEmail: string;
  requesterName: string; requesterRole: PortalRole; status: string; original: Record<string, unknown>;
  proposal: Record<string, unknown>; requesterNote: string; reviewerEmail: string | null;
  reviewNote: string; createdAt: string; archivedAt: string | null;
};
type AccessEvent = { id: number; actorEmail: string; eventType: string; note: string; createdAt: string };
type AccessRequest = {
  id: string; requesterEmail: string; requesterName: string; phone: string; requestedRole: PortalRole;
  zone: string | null; groupId: number | null; groupName: string; reason: string; status: string;
  reviewNote: string; createdAt: string; updatedAt: string; archivedAt: string | null; events: AccessEvent[];
};
type PortalUser = {
  id: string; email: string; name: string; phone: string; role: string; zone: string | null;
  roleLabel: string; groupId: number | null; groupName: string; active: boolean; notes: string; source: string;
  createdBy: string | null; createdAt: string; updatedAt: string; systemManaged: boolean;
};
type UserDraft = {
  email: string; name: string; phone: string; role: string; zone: string;
  roleLabel: string; groupId: string; notes: string; active: boolean;
};

const zones = ["Jaguar", "Tiburón", "Delfín", "Colibrí", "Águila"];
const fieldLabels: Record<string, string> = {
  zone: "Zona", name: "Nombre del grupo", city: "Ciudad", state: "Estado", leaderName: "Líder",
  subleaderName: "Sublíder", whatsapp: "WhatsApp", email: "Correo del grupo",
  facebook: "Facebook", address: "Dirección", mapsUrl: "Enlace de mapa", schedules: "Horarios", sessionTypes: "Tipos de sesiones", status: "Estado",
};
const sensitiveFields = new Set(["zone", "name", "leaderName", "status"]);
const roleLabels: Record<string, string> = {
  member: "Guerrero de la Luz",
  leader: "Líder", osg: "OSG", delegate: "Delegado", council: "Consejo",
  admin: "Administración", pending: "Sin perfil asignado",
};
const statusLabels: Record<string, string> = {
  pending: "Pendiente", in_review: "En revisión", approved: "Aprobada",
  rejected: "Rechazada", changes_requested: "Solicitaron ajustes",
};
const eventLabels: Record<string, string> = {
  submitted: "Solicitud enviada", updated: "Datos actualizados", resubmitted: "Correcciones reenviadas",
  review_changes_requested: "Se solicitaron correcciones", review_approved: "Acceso aprobado y activado",
  review_rejected: "Solicitud no aprobada",
};
const emptyUserDraft: UserDraft = {
  email: "", name: "", phone: "", role: "", roleLabel: "", zone: "", groupId: "", notes: "", active: false,
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

function permanentId(group: DirectoryGroup) {
  const codes: Record<string, string> = { Jaguar: "JAG", "Tiburón": "TIB", "Delfín": "DEL", "Colibrí": "COL", "Águila": "AGU" };
  return `FGDLL-${codes[group.zone] || "GRP"}-${String(group.id).padStart(3, "0")}`;
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
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, incomplete: 0 });
  const [stats, setStats] = useState<Stats>({ groups: 0, verified: 0, unverified: 0, pendingChanges: 0, pendingAccess: 0 });
  const [tab, setTab] = useState<"groups" | "changes" | "access" | "users">("groups");
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
  const [accessSearch, setAccessSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("open");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userEditorOpen, setUserEditorOpen] = useState(false);
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUserDraft);
  const [deletingGroup, setDeletingGroup] = useState<DirectoryGroup | null>(null);
  const [groupDeleteConfirmation, setGroupDeleteConfirmation] = useState("");

  const canReviewChanges = profile ? ["admin", "council", "delegate"].includes(profile.role) : false;
  const canReviewAccess = profile ? ["admin", "council"].includes(profile.role) : false;
  const isAdmin = profile?.role === "admin";
  const availableZones = useMemo(() => Array.from(new Set(groups.map((group) => group.zone))).sort(), [groups]);
  const filteredGroups = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return groups.filter((group) => {
      const inZone = zoneFilter === "Todas" || group.zone === zoneFilter;
      const haystack = `${group.name} ${group.city} ${group.leaderName} ${group.zone}`.toLocaleLowerCase("es");
      return inZone && (!term || haystack.includes(term));
    });
  }, [groups, search, zoneFilter]);
  const filteredAccess = useMemo(() => {
    const term = accessSearch.trim().toLocaleLowerCase("es");
    return accessRequests.filter((request) => {
      const inStatus = accessFilter === "all"
        || (accessFilter === "open" && ["pending", "in_review", "changes_requested"].includes(request.status))
        || (accessFilter === "corrections" && request.status === "changes_requested")
        || (accessFilter === "resolved" && ["approved", "rejected"].includes(request.status) && !request.archivedAt)
        || (accessFilter === "archived" && Boolean(request.archivedAt));
      const haystack = `${request.id} ${request.requesterName} ${request.requesterEmail} ${request.groupName} ${request.zone ?? ""}`.toLocaleLowerCase("es");
      return inStatus && (!term || haystack.includes(term));
    });
  }, [accessRequests, accessFilter, accessSearch]);
  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLocaleLowerCase("es");
    return portalUsers.filter((user) => {
      const inStatus = userFilter === "all" || (userFilter === "active" && user.active)
        || (userFilter === "inactive" && !user.active) || (userFilter === "incomplete" && user.role === "pending");
      const haystack = `${user.name} ${user.email} ${user.phone} ${user.roleLabel || roleLabels[user.role] || user.role} ${user.groupName} ${user.zone ?? ""}`.toLocaleLowerCase("es");
      return inStatus && (!term || haystack.includes(term));
    });
  }, [portalUsers, userFilter, userSearch]);

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
      const [directory, access, users] = await Promise.all([
        fetch(canReviewChanges ? "/api/directory/changes?archived=1" : "/api/directory/changes", { cache: "no-store" }).then(jsonResponse),
        ["admin", "council"].includes(me.profile.role)
          ? fetch("/api/access-requests?archived=1", { cache: "no-store" }).then(jsonResponse)
          : Promise.resolve({ requests: [] }),
        me.profile.role === "admin"
          ? fetch("/api/portal/users", { cache: "no-store" }).then(jsonResponse)
          : Promise.resolve({ users: [], stats: { total: 0, active: 0, incomplete: 0 } }),
      ]);
      setGroups(directory.groups || []);
      setChanges(directory.changes || []);
      setStats(directory.stats || { groups: 0, verified: 0, unverified: 0, pendingChanges: 0, pendingAccess: 0 });
      setAccessRequests(access.requests || []);
      setPortalUsers(users.users || []);
      setUserStats(users.stats || { total: 0, active: 0, incomplete: 0 });
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
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: editing.id, proposal, note: editNote }),
      }).then(jsonResponse);
      setEditing(null);
      setDraft(null);
      setNotice(result.requiresApproval ? `Cambio enviado con el folio ${result.id}. Quedó pendiente de aprobación.` : `Directorio actualizado. Folio de control: ${result.id}.`);
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
        method: "PATCH", headers: { "content-type": "application/json" },
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

  async function manageRequest(kind: "directory" | "access", id: string, action: "archive" | "unarchive" | "delete") {
    const endpoint = kind === "directory" ? "/api/directory/changes" : "/api/access-requests";
    const confirmation = action === "delete" ? window.prompt(`Escribe el folio ${id} para eliminar definitivamente.`) : "";
    if (action === "delete" && confirmation !== id) return;
    setBusy(`${kind}-${id}-${action}`);
    setError("");
    try {
      await fetch(endpoint, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "delete" ? { id, confirmation } : { id, action }),
      }).then(jsonResponse);
      setNotice(action === "delete" ? `${id}: eliminado definitivamente.` : action === "archive" ? `${id}: archivado.` : `${id}: restaurado.`);
      await load(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No fue posible gestionar la solicitud.");
    } finally {
      setBusy("");
    }
  }

  function openNewUser() {
    setEditingUserEmail(null);
    setUserDraft(emptyUserDraft);
    setUserEditorOpen(true);
    setError("");
  }

  function openUser(user: PortalUser) {
    if (user.systemManaged) return;
    setEditingUserEmail(user.email);
    setUserDraft({
      email: user.email, name: user.name, phone: user.phone, role: user.role === "pending" ? "" : user.role, roleLabel: user.roleLabel || "",
      zone: user.zone ?? "", groupId: user.groupId ? String(user.groupId) : "", notes: user.notes, active: user.active,
    });
    setUserEditorOpen(true);
    setError("");
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setBusy("user");
    setError("");
    try {
      await fetch("/api/portal/users", {
        method: editingUserEmail ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...userDraft, groupId: userDraft.groupId || null }),
      }).then(jsonResponse);
      setUserEditorOpen(false);
      setNotice(editingUserEmail ? `Se actualizaron los datos de ${userDraft.email}.` : `Se agregó ${userDraft.email} al padrón de usuarios.`);
      setTab("users");
      await load(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar el usuario.");
    } finally {
      setBusy("");
    }
  }

  async function deleteGroup() {
    if (!deletingGroup) return;
    setBusy("delete-group");
    setError("");
    try {
      const result = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deletingGroup.id, confirmation: groupDeleteConfirmation }),
      }).then(jsonResponse);
      setDeletingGroup(null);
      setGroupDeleteConfirmation("");
      setNotice(`Se eliminó ${result.name}. ${result.affectedUsers ? `${result.affectedUsers} usuario(s) relacionado(s) quedaron sin ese alcance.` : "No tenía usuarios relacionados."}`);
      await load(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible borrar el grupo.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <><SubHeader label="Gestión del directorio" /><main className="directory-admin"><div className="shell panel-loading full-page">Abriendo el panel institucional…</div></main><SubFooter /></>;
  if (!profile) return <><SubHeader label="Gestión del directorio" /><main className="directory-admin"><section className="section"><div className="shell"><div className="access-needed"><span>Acceso pendiente</span><h1>Tu cuenta todavía no tiene un perfil activo.</h1><p>Solicita la función y el alcance que te corresponden para entrar a esta sección.</p><Link className="button button-gold" href="/solicitar-acceso">Solicitar acceso</Link></div></div></section></main><SubFooter /></>;

  const changedSensitive = editing && draft ? Array.from(sensitiveFields).some((field) => displayValue(editing[field as keyof DirectoryGroup]) !== displayValue(draft[field as keyof DirectoryGroup])) : false;
  const needsApproval = profile.role === "member" || profile.role === "leader" || profile.role === "osg" || (profile.role === "delegate" && changedSensitive);
  const userNeedsGroup = userDraft.role === "leader" || userDraft.role === "osg";
  const userNeedsZone = userDraft.role === "delegate";
  const userGroups = userDraft.zone ? groups.filter((group) => group.zone === userDraft.zone) : groups;

  return <>
    <SubHeader label="Gestión del directorio" />
    <main className="directory-admin">
      <section className="admin-hero"><div className="shell admin-hero-grid"><div><span className="eyebrow light">Administración de la red</span><h1>Personas, solicitudes y directorio en un solo lugar.</h1><p>Da seguimiento sin perder el contexto. Cada alta, corrección y decisión queda identificada por correo, fecha y folio.</p></div><aside><span className="role-badge">{profile.roleLabel}</span><strong>{profile.name}</strong><small>{profile.email}</small>{profile.zone && <p>Zona {profile.zone}</p>}</aside></div></section>
      <section className="admin-strip"><div className="shell"><span><b>Regla activa</b>{profile.role === "member" ? "Puedes proponer correcciones; administración las revisa antes de publicar." : profile.role === "leader" || profile.role === "osg" ? "Tus cambios pasan a aprobación." : profile.role === "delegate" ? "Datos operativos se publican; nombre, zona, líder y estado pasan a Consejo." : "Puedes actualizar, revisar solicitudes y dar de alta."}</span><a href="mailto:admin@fgdll.org">Soporte: admin@fgdll.org</a></div></section>
      <section className="admin-workspace"><div className="shell">
        <div className="stats-grid"><article><span>Grupos bajo tu alcance</span><strong>{stats.groups}</strong></article><article><span>Información verificada</span><strong>{stats.verified}</strong></article><article><span>Sin verificar</span><strong>{stats.unverified}</strong></article><article><span>Cambios pendientes</span><strong>{stats.pendingChanges}</strong></article>{canReviewAccess && <article><span>Solicitudes abiertas</span><strong>{stats.pendingAccess}</strong></article>}{isAdmin ? <article><span>Usuarios activos</span><strong>{userStats.active}</strong></article> : <article className="stat-action"><span>Directorio público</span><Link href="/#directorio">Ver publicación ↗</Link></article>}</div>
        {(error || notice) && <div className={`panel-alert ${error ? "error" : "ok"}`}><span>{error ? "!" : "✓"}</span><p>{error || notice}</p><button onClick={() => { setError(""); setNotice(""); }} aria-label="Cerrar aviso">×</button></div>}
        <div className="panel-tabs" role="tablist"><button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>Grupos <b>{stats.groups}</b></button><button className={tab === "changes" ? "active" : ""} onClick={() => setTab("changes")}>Cambios <b>{changes.length}</b></button>{canReviewAccess && <button className={tab === "access" ? "active" : ""} onClick={() => setTab("access")}>Solicitudes <b>{stats.pendingAccess}</b></button>}{isAdmin && <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Usuarios <b>{userStats.total}</b></button>}{isAdmin && <Link className="admin-content-link" href="/administracion/contenidos">Contenidos <b>→</b></Link>}</div>

        {tab === "groups" && <section className="panel-section"><div className="panel-section-head"><div><span>DIRECTORIO</span><h2>Información de grupos</h2></div><p>Busca, revisa y abre un registro para actualizarlo.</p></div><div className="panel-filters"><label><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo, ciudad o líder…" /></label><select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}><option>Todas</option>{availableZones.map((zone) => <option key={zone}>{zone}</option>)}</select></div><div className="managed-group-grid">{filteredGroups.map((group) => <article key={group.id}><div className="managed-group-top"><span>{group.zone}</span><small className={`group-status ${group.status}`}>{displayValue(group.status, "status")}</small></div><h3>{group.name}</h3><p>{group.city || "Ciudad sin registrar"}</p><dl><div><dt>ID</dt><dd>{permanentId(group)}</dd></div><div><dt>Líder</dt><dd>{group.leaderName || "Sin registrar"}</dd></div><div><dt>WhatsApp</dt><dd>{group.whatsapp || "Sin registrar"}</dd></div><div><dt>Verificación</dt><dd>{group.verifiedAt ? friendlyDate(group.verifiedAt) : "Pendiente"}</dd></div></dl><footer><small>Versión {group.version}</small><div><button onClick={() => openEditor(group)}>Editar datos <span>→</span></button>{isAdmin && <button className="group-delete-action" onClick={() => { setDeletingGroup(group); setGroupDeleteConfirmation(""); }}>Borrar</button>}</div></footer></article>)}</div>{!filteredGroups.length && <div className="empty-panel"><span>⌕</span><p>No hay grupos que coincidan con la búsqueda.</p></div>}</section>}

        {tab === "changes" && <section className="panel-section"><div className="panel-section-head"><div><span>TRAZABILIDAD</span><h2>Solicitudes de cambio</h2></div><p>{canReviewChanges ? "Compara la información y registra una decisión." : "Consulta el avance de los cambios que has enviado."}</p></div><div className="review-list">{changes.map((change) => { const fields = Object.keys(change.proposal); const hasSensitive = fields.some((field) => sensitiveFields.has(field)); const delegateCannotApprove = profile.role === "delegate" && hasSensitive; const open = change.status === "pending" || change.status === "in_review"; return <article className={`review-card ${change.archivedAt ? "archived" : ""}`} key={change.id}><header><div><span>{change.id}</span><h3>{change.groupName}</h3><p>Zona {change.groupZone} · {friendlyDate(change.createdAt)}</p></div><span className={`status-pill status-${change.status}`}>{change.archivedAt ? "Archivada" : statusLabels[change.status] || change.status}</span></header><div className="requester-line"><span>Solicitó</span><strong>{change.requesterName || change.requesterEmail}</strong><small>{roleLabels[change.requesterRole]} · {change.requesterEmail}</small></div><div className="diff-list">{fields.map((field) => <div key={field} className={sensitiveFields.has(field) ? "sensitive" : ""}><span>{fieldLabels[field] || field}{sensitiveFields.has(field) && <b>Consejo</b>}</span><p><del>{displayValue(change.original[field], field)}</del><ins>{displayValue(change.proposal[field], field)}</ins></p></div>)}</div>{change.requesterNote && <blockquote><b>Nota de quien solicita:</b> {change.requesterNote}</blockquote>}{change.reviewNote && <blockquote className="review-note"><b>Resolución:</b> {change.reviewNote}</blockquote>}{canReviewChanges && open && !change.archivedAt && <div className="review-actions"><label><span>Nota de revisión</span><textarea value={reviewNotes[change.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [change.id]: event.target.value }))} rows={2} placeholder="Opcional al aprobar; necesaria si solicitas ajustes." /></label>{delegateCannotApprove && <p className="escalation-note">Este cambio incluye datos sensibles y debe aprobarlo Consejo o administración.</p>}<div><button className="review-approve" disabled={delegateCannotApprove || Boolean(busy)} onClick={() => review("directory", change.id, "approve")}>{busy === `directory-${change.id}-approve` ? "Guardando…" : "Aprobar"}</button><button disabled={Boolean(busy)} onClick={() => review("directory", change.id, "request_changes")}>Solicitar ajustes</button><button className="review-reject" disabled={Boolean(busy)} onClick={() => review("directory", change.id, "reject")}>Rechazar</button></div></div>}{canReviewChanges && <div className="request-maintenance"><button disabled={Boolean(busy)} onClick={() => manageRequest("directory", change.id, change.archivedAt ? "unarchive" : "archive")}>{change.archivedAt ? "Restaurar" : "Archivar"}</button>{isAdmin && <button className="danger-button" disabled={Boolean(busy)} onClick={() => manageRequest("directory", change.id, "delete")}>Eliminar</button>}</div>}</article>; })}</div>{!changes.length && <div className="empty-panel"><span>✓</span><p>Todavía no hay solicitudes de cambio.</p></div>}</section>}

        {tab === "access" && canReviewAccess && <section className="panel-section access-panel"><div className="panel-section-head"><div><span>EXPEDIENTES DE ACCESO</span><h2>Solicitudes de usuarios</h2></div><div className="section-head-actions"><p>Consulta solicitudes abiertas y resueltas; puedes dar de alta incluso después de pedir correcciones.</p>{isAdmin && <button className="button button-gold" onClick={openNewUser}>+ Alta manual</button>}</div></div><div className="panel-filters access-filters"><label><span>⌕</span><input value={accessSearch} onChange={(event) => setAccessSearch(event.target.value)} placeholder="Buscar por nombre, correo o folio…" /></label><select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)}><option value="open">Abiertas</option><option value="corrections">Esperando corrección</option><option value="resolved">Resueltas</option><option value="archived">Archivadas</option><option value="all">Todas</option></select></div><div className="review-list">{filteredAccess.map((request) => { const open = ["pending", "in_review", "changes_requested"].includes(request.status); const canApprove = !request.archivedAt && (open || (isAdmin && request.status === "rejected")); return <article className={`review-card access-review ${request.archivedAt ? "archived" : ""}`} key={request.id}><header><div><span>{request.id}</span><h3>{request.requesterName}</h3><p>Último movimiento: {friendlyDate(request.updatedAt || request.createdAt)}</p></div><span className={`status-pill status-${request.status}`}>{request.archivedAt ? "Archivada" : statusLabels[request.status] || request.status}</span></header><div className="access-facts"><div><span>Correo obligatorio</span><strong>{request.requesterEmail}</strong></div><div><span>Perfil</span><strong>{roleLabels[request.requestedRole] || request.requestedRole}</strong></div><div><span>Alcance</span><strong>{request.groupName || (request.zone ? `Zona ${request.zone}` : "Institucional")}</strong></div><div><span>Contacto</span><strong>{request.phone || "Sin teléfono"}</strong></div></div>{request.reason && <blockquote><b>Información de validación:</b> {request.reason}</blockquote>}{request.reviewNote && <blockquote className="review-note"><b>Última indicación:</b> {request.reviewNote}</blockquote>}<details className="request-file"><summary>Ver expediente e historial <span>→</span></summary><div className="request-file-body"><div className="request-timeline">{request.events?.length ? request.events.map((event) => <div key={event.id}><i /><span><strong>{eventLabels[event.eventType] || event.eventType}</strong><small>{friendlyDate(event.createdAt)} · {event.actorEmail}</small>{event.note && <p>{event.note}</p>}</span></div>) : <div><i /><span><strong>Solicitud registrada</strong><small>{friendlyDate(request.createdAt)}</small></span></div>}</div></div></details>{canApprove && <div className="review-actions"><label><span>Nota de revisión</span><textarea value={reviewNotes[request.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} placeholder="Explica la corrección solicitada o deja una nota de alta." /></label><div><button className="review-approve" disabled={Boolean(busy)} onClick={() => review("access", request.id, "approve")}>{busy === `access-${request.id}-approve` ? "Dando de alta…" : request.status === "rejected" ? "Reconsiderar y dar de alta" : "Dar de alta"}</button>{open && <><button disabled={Boolean(busy)} onClick={() => review("access", request.id, "request_changes")}>Solicitar corrección</button><button className="review-reject" disabled={Boolean(busy)} onClick={() => review("access", request.id, "reject")}>Rechazar</button></>}</div></div>}<div className="request-maintenance"><button disabled={Boolean(busy)} onClick={() => manageRequest("access", request.id, request.archivedAt ? "unarchive" : "archive")}>{request.archivedAt ? "Restaurar" : "Archivar"}</button>{isAdmin && <button className="danger-button" disabled={Boolean(busy)} onClick={() => manageRequest("access", request.id, "delete")}>Eliminar</button>}</div></article>; })}</div>{!filteredAccess.length && <div className="empty-panel"><span>✓</span><p>No hay solicitudes en esta vista. Cambia el filtro para consultar el historial completo.</p></div>}</section>}

        {tab === "users" && isAdmin && <section className="panel-section users-panel"><div className="panel-section-head"><div><span>PADRÓN DE USUARIOS</span><h2>Usuarios del portal</h2></div><div className="section-head-actions"><p>Agrega personas con datos completos o parciales. El correo siempre es obligatorio.</p><button className="button button-gold" onClick={openNewUser}>+ Agregar usuario</button></div></div><div className="user-summary"><span><b>{userStats.active}</b> activos</span><span><b>{userStats.incomplete}</b> por completar</span><span><b>{userStats.total}</b> registros</span></div><div className="panel-filters"><label><span>⌕</span><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar nombre, correo, teléfono o grupo…" /></label><select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="incomplete">Datos incompletos</option></select></div><div className="portal-user-list">{filteredUsers.map((user) => <article key={user.id} className={!user.active ? "inactive" : ""}><div className="user-avatar">{(user.name || user.email).charAt(0).toUpperCase()}</div><div className="user-identity"><div><h3>{user.name || "Nombre pendiente"}</h3><span className={`user-state ${user.active ? "active" : "inactive"}`}>{user.active ? "Acceso activo" : "Sin acceso"}</span></div><a href={`mailto:${user.email}`}>{user.email}</a><small>{user.phone || "Teléfono pendiente"}</small></div><div className="user-scope"><span>Perfil</span><strong>{user.roleLabel || roleLabels[user.role] || user.role}</strong><small>{user.groupName || (user.zone ? `Zona ${user.zone}` : user.role === "member" ? "Acceso general" : "Alcance pendiente")}</small></div><div className="user-source"><span>Origen</span><strong>{user.source === "self_registration" ? "Registro abierto" : user.source === "request" ? "Solicitud" : user.source === "system" ? "Administración principal" : "Alta manual"}</strong>{user.notes && <small>{user.notes}</small>}</div><button className="user-edit" disabled={user.systemManaged} onClick={() => openUser(user)}>{user.systemManaged ? "Protegido" : "Editar"}</button></article>)}</div>{!filteredUsers.length && <div className="empty-panel"><span>⌕</span><p>No hay usuarios que coincidan con esta búsqueda.</p></div>}</section>}
      </div></section>
    </main>

    {editing && draft && <div className="editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title"><header><div><span>EDITAR DIRECTORIO</span><h2 id="editor-title">{editing.name}</h2><p>Zona {editing.zone} · versión {editing.version}</p></div><button onClick={() => setEditing(null)} aria-label="Cerrar editor">×</button></header><form onSubmit={submitChange}><div className="editor-body"><div className="editor-guidance"><span>Cómo se publicará</span><p>{needsApproval ? "Al guardar, se creará una solicitud para aprobación antes de modificar el directorio público." : "Al guardar, el directorio se actualizará inmediatamente y quedará un folio de auditoría."}</p>{changedSensitive && <strong>Incluiste un dato sensible: requiere revisión de Consejo o administración.</strong>}</div><div className="editor-grid"><label className="sensitive-field"><span>Nombre del grupo <b>Consejo</b></span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required /></label><label className="sensitive-field"><span>Zona <b>Consejo</b></span><select value={draft.zone} onChange={(event) => updateDraft("zone", event.target.value)} required>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label><label><span>Ciudad</span><input value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} /></label><label className="sensitive-field"><span>Líder <b>Consejo</b></span><input value={draft.leaderName} onChange={(event) => updateDraft("leaderName", event.target.value)} /></label><label><span>Sublíder / OSG</span><input value={draft.subleaderName} onChange={(event) => updateDraft("subleaderName", event.target.value)} /></label><label><span>WhatsApp</span><input value={draft.whatsapp} onChange={(event) => updateDraft("whatsapp", event.target.value)} inputMode="tel" /></label><label><span>Correo del grupo</span><input value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} type="email" /></label><label><span>Facebook</span><input value={draft.facebook} onChange={(event) => updateDraft("facebook", event.target.value)} placeholder="https://facebook.com/…" /></label><label className="wide"><span>Dirección</span><textarea value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} rows={2} /></label><label className="wide"><span>Enlace de Google Maps</span><input value={draft.mapsUrl} onChange={(event) => updateDraft("mapsUrl", event.target.value)} placeholder="https://maps.google.com/…" /></label><label className="wide"><span>Días y horarios</span><textarea value={draft.schedules} onChange={(event) => updateDraft("schedules", event.target.value)} rows={3} placeholder="Ej. Lunes a viernes, 20:00 h" /></label><label className="wide"><span>Tipos de sesiones</span><textarea value={draft.sessionTypes} onChange={(event) => updateDraft("sessionTypes", event.target.value)} rows={2} placeholder="Ej. sesión principal, jóvenes o diversidad" /></label><label className="sensitive-field"><span>Estado <b>Consejo</b></span><select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="closed">Cerrado</option></select></label><label className="wide"><span>Motivo o contexto del cambio</span><textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} rows={3} placeholder="Ayuda a quien revise a entender por qué se necesita el cambio." /></label></div></div><footer><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-gold" disabled={busy === "edit"}>{busy === "edit" ? "Guardando…" : needsApproval ? "Enviar a aprobación" : "Guardar y publicar"}</button></footer></form></section></div>}

    {userEditorOpen && <div className="editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUserEditorOpen(false); }}><section className="editor-sheet user-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="user-editor-title"><header><div><span>{editingUserEmail ? "EDITAR USUARIO" : "ALTA MANUAL"}</span><h2 id="user-editor-title">{editingUserEmail ? userDraft.email : "Nuevo usuario"}</h2><p>El correo es el único dato siempre obligatorio.</p></div><button onClick={() => setUserEditorOpen(false)} aria-label="Cerrar editor">×</button></header><form onSubmit={saveUser}><div className="editor-body"><div className="editor-guidance"><span>Alta flexible</span><p>Puedes guardar sólo el correo y completar lo demás después. Para conceder acceso, asigna perfil y alcance, y activa la casilla final.</p></div><div className="editor-grid"><label className="wide required-field"><span>Correo electrónico obligatorio</span><input type="email" value={userDraft.email} disabled={Boolean(editingUserEmail)} onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))} required placeholder="persona@correo.com" /></label><label><span>Nombre completo</span><input value={userDraft.name} onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Puede completarse después" /></label><label><span>Teléfono / WhatsApp</span><input value={userDraft.phone} onChange={(event) => setUserDraft((current) => ({ ...current, phone: event.target.value }))} inputMode="tel" placeholder="Opcional" /></label><label><span>Perfil</span><select value={userDraft.role} onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value, roleLabel: "", groupId: "", zone: "", active: false }))}><option value="">Sin asignar todavía</option><option value="member">Otro / general</option><option value="leader">Líder</option><option value="osg">OSG</option><option value="delegate">Delegado</option><option value="council">Consejo</option></select></label>{userDraft.role === "member" && <label><span>Otro: función</span><input value={userDraft.roleLabel} onChange={(event) => setUserDraft((current) => ({ ...current, roleLabel: event.target.value }))} placeholder="Conciencia, Militante, etc." maxLength={80} /></label>}{(userNeedsGroup || userNeedsZone) && <label><span>Zona</span><select value={userDraft.zone} onChange={(event) => setUserDraft((current) => ({ ...current, zone: event.target.value, groupId: "" }))}><option value="">Selecciona una zona</option>{zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></label>}{userNeedsGroup && <label className="wide"><span>Grupo</span><select value={userDraft.groupId} onChange={(event) => { const selected = groups.find((group) => group.id === Number(event.target.value)); setUserDraft((current) => ({ ...current, groupId: event.target.value, zone: selected?.zone || current.zone })); }}><option value="">Selecciona el grupo</option>{userGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.city}</option>)}</select></label>}<label className="wide"><span>Notas internas</span><textarea value={userDraft.notes} onChange={(event) => setUserDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Datos pendientes, quién validó o cualquier contexto útil." /></label><label className="wide activation-toggle"><input type="checkbox" checked={userDraft.active} onChange={(event) => setUserDraft((current) => ({ ...current, active: event.target.checked }))} /><span><b>Activar acceso al guardar</b><small>Si faltan perfil o alcance, déjalo desactivado y completa el registro después.</small></span></label></div></div><footer><button type="button" onClick={() => setUserEditorOpen(false)}>Cancelar</button><button className="button button-gold" disabled={busy === "user"}>{busy === "user" ? "Guardando…" : userDraft.active ? "Guardar y dar acceso" : "Guardar registro"}</button></footer></form></section></div>}
    {deletingGroup && <div className="editor-overlay delete-overlay" role="presentation"><section className="delete-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-group-title"><span>ACCIÓN DEFINITIVA</span><h2 id="delete-group-title">¿Borrar “{deletingGroup.name}”?</h2><p>Se quitará del directorio. Los líderes u OSG ligados a este grupo quedarán desactivados para evitar accesos sin alcance, y las solicitudes conservarán el nombre del grupo en su historial.</p><label><span>Escribe el nombre exacto del grupo</span><input value={groupDeleteConfirmation} onChange={(event) => setGroupDeleteConfirmation(event.target.value)} autoFocus /></label><div><button onClick={() => setDeletingGroup(null)}>Cancelar</button><button className="danger-button" disabled={busy === "delete-group" || groupDeleteConfirmation !== deletingGroup.name} onClick={() => void deleteGroup()}>{busy === "delete-group" ? "Borrando…" : "Borrar grupo definitivamente"}</button></div></section></div>}
    <SubFooter />
  </>;
}
