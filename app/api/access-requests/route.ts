import {
  archiveAccessRequest,
  createAccessRequest,
  deleteAccessRequest,
  getDirectoryGroup,
  getPortalProfile,
  listAccessRequestEvents,
  listAccessRequests,
  listOwnAccessRequests,
  PortalError,
  resubmitAccessRequest,
  reviewAccessRequest,
} from "../../lib/directory-store";
import { apiError, readJson, requireApiProfile, requireApiUser } from "../../lib/portal-api";
import { grantUniversityAccessFromPortalRequest } from "../../lib/university-store";

export const dynamic = "force-dynamic";

function parseSnapshot(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function serializeEvent(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    requestId: String(row.request_id ?? ""),
    actorEmail: String(row.actor_email ?? ""),
    eventType: String(row.event_type ?? ""),
    note: String(row.note ?? ""),
    snapshot: parseSnapshot(row.snapshot_json),
    createdAt: String(row.created_at ?? ""),
  };
}

function serializeRequest(row: Record<string, unknown>, events: ReturnType<typeof serializeEvent>[] = []) {
  return {
    id: String(row.id),
    requesterEmail: String(row.requester_email ?? ""),
    requesterName: String(row.requester_name ?? ""),
    phone: String(row.phone ?? ""),
    requestedRole: String(row.requested_role ?? ""),
    requestedRoleLabel: String(row.requested_role_label ?? ""),
    zone: row.zone ? String(row.zone) : null,
    groupId: row.group_id == null ? null : Number(row.group_id),
    groupName: String(row.directory_group_name ?? row.group_name ?? ""),
    reason: String(row.reason ?? ""),
    status: String(row.status ?? "pending"),
    reviewerEmail: row.reviewer_email ? String(row.reviewer_email) : null,
    reviewNote: String(row.review_note ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    events,
  };
}

async function accessPayload(body: Record<string, unknown>) {
  const requestedRole = String(body.requestedRole ?? "");
  const requestedRoleLabel = String(body.requestedRoleLabel ?? "").trim();
  const groupId = body.groupId ? Number(body.groupId) : null;
  const zone = String(body.zone ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!name) throw new PortalError("Escribe tu nombre completo.");
  if (requestedRole === "member" && !requestedRoleLabel) {
    throw new PortalError("Escribe tu función en Otro.");
  }
  if ((requestedRole === "leader" || requestedRole === "osg") && !groupId) {
    throw new PortalError("Selecciona el grupo al que perteneces.");
  }
  if (requestedRole === "delegate" && !zone) throw new PortalError("Selecciona tu zona.");

  const group = groupId ? await getDirectoryGroup(groupId) : null;
  if (groupId && !group) throw new PortalError("El grupo seleccionado no existe.");
  return {
    name,
    phone: String(body.phone ?? ""),
    requestedRole,
    requestedRoleLabel,
    zone: group?.zone || zone || undefined,
    groupId,
    groupName: group?.name,
    reason: String(body.reason ?? ""),
    responseNote: String(body.responseNote ?? ""),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const includeArchived = new URL(request.url).searchParams.get("archived") === "1";
    const profile = await getPortalProfile(user.email, user.displayName);
    const rows = profile ? await listAccessRequests(profile, user.email, includeArchived) : await listOwnAccessRequests(user.email, includeArchived);
    if (!profile && rows.length) {
      const ownRequest = rows.find((row) => String(row.requester_email ?? "").toLowerCase() === user.email.toLowerCase()) ?? rows[0];
      await grantUniversityAccessFromPortalRequest({
        email: user.email,
        fullName: String(ownRequest.requester_name ?? user.displayName),
        mobilePhone: String(ownRequest.phone ?? ""),
        organization: String(ownRequest.directory_group_name ?? ownRequest.group_name ?? ownRequest.zone ?? ""),
        requestNotes: `Solicitud general ${String(ownRequest.id ?? "")}`,
      });
    }
    const requestIds = rows.map((row) => String(row.id));
    const eventRows = await listAccessRequestEvents(requestIds);
    const eventsByRequest = new Map<string, ReturnType<typeof serializeEvent>[]>();
    for (const row of eventRows) {
      const event = serializeEvent(row);
      const current = eventsByRequest.get(event.requestId) ?? [];
      current.push(event);
      eventsByRequest.set(event.requestId, current);
    }
    return Response.json({
      requests: rows.map((row) => serializeRequest(row, eventsByRequest.get(String(row.id)) ?? [])),
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await readJson(request);
    const payload = await accessPayload(body);
    const result = await createAccessRequest({ email: user.email, ...payload });
    await grantUniversityAccessFromPortalRequest({
      email: user.email,
      fullName: payload.name,
      mobilePhone: payload.phone,
      organization: payload.groupName || payload.zone || "",
      requestNotes: `Solicitud general ${result.id}`,
    });
    return Response.json({ ...result, accessGranted: true, universityUrl: "/formacion#aula" }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await readJson(request);
    const id = String(body.id ?? "");
    if (!id) throw new PortalError("No se encontró el folio que deseas corregir.");
    const payload = await accessPayload(body);
    const result = await resubmitAccessRequest({ requesterEmail: user.email, id, ...payload });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const action = String(body.action ?? "");
    if (action === "archive" || action === "unarchive") {
      return Response.json(await archiveAccessRequest(profile, { id: String(body.id ?? ""), archived: action === "archive" }));
    }
    const result = await reviewAccessRequest(profile, {
      id: String(body.id ?? ""),
      action,
      note: String(body.note ?? ""),
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    return Response.json(await deleteAccessRequest(profile, {
      id: String(body.id ?? ""),
      confirmation: String(body.confirmation ?? ""),
    }));
  } catch (error) {
    return apiError(error);
  }
}
