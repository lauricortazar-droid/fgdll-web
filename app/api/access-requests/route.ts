import {
  createAccessRequest,
  getDirectoryGroup,
  getPortalProfile,
  listAccessRequests,
  listOwnAccessRequests,
  PortalError,
  reviewAccessRequest,
} from "../../lib/directory-store";
import { apiError, readJson, requireApiProfile, requireApiUser } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

function serializeRequest(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    requesterEmail: String(row.requester_email ?? ""),
    requesterName: String(row.requester_name ?? ""),
    phone: String(row.phone ?? ""),
    requestedRole: String(row.requested_role ?? ""),
    zone: row.zone ? String(row.zone) : null,
    groupId: row.group_id == null ? null : Number(row.group_id),
    groupName: String(row.directory_group_name ?? row.group_name ?? ""),
    reason: String(row.reason ?? ""),
    status: String(row.status ?? "pending"),
    reviewerEmail: row.reviewer_email ? String(row.reviewer_email) : null,
    reviewNote: String(row.review_note ?? ""),
    createdAt: String(row.created_at ?? ""),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const profile = await getPortalProfile(user.email, user.displayName);
    const rows = profile ? await listAccessRequests(profile, user.email) : await listOwnAccessRequests(user.email);
    return Response.json({ requests: rows.map(serializeRequest) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await readJson(request);
    const requestedRole = String(body.requestedRole ?? "");
    const groupId = body.groupId ? Number(body.groupId) : null;
    const zone = String(body.zone ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!name) throw new PortalError("Escribe tu nombre completo.");
    if ((requestedRole === "leader" || requestedRole === "osg") && !groupId) {
      throw new PortalError("Selecciona el grupo al que perteneces.");
    }
    if (requestedRole === "delegate" && !zone) throw new PortalError("Selecciona tu zona.");

    const group = groupId ? await getDirectoryGroup(groupId) : null;
    if (groupId && !group) throw new PortalError("El grupo seleccionado no existe.");
    const result = await createAccessRequest({
      email: user.email,
      name,
      phone: String(body.phone ?? ""),
      requestedRole,
      zone: zone || group?.zone || undefined,
      groupId,
      groupName: group?.name,
      reason: String(body.reason ?? ""),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const result = await reviewAccessRequest(profile, {
      id: String(body.id ?? ""),
      action: String(body.action ?? ""),
      note: String(body.note ?? ""),
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
