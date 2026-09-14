import {
  archiveDirectoryChange,
  dashboardStats,
  deleteDirectoryChange,
  groupsForProfile,
  listDirectoryChanges,
  PortalError,
  reviewDirectoryChange,
  submitDirectoryChange,
} from "../../../lib/directory-store";
import { apiError, readJson, requireApiProfile } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

function parseObject(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function serializeChange(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    groupId: Number(row.group_id),
    groupVersion: Number(row.group_version),
    groupName: String(row.group_name ?? ""),
    groupZone: String(row.group_zone ?? ""),
    requesterEmail: String(row.requester_email ?? ""),
    requesterName: String(row.requester_name ?? ""),
    requesterRole: String(row.requester_role ?? ""),
    status: String(row.status ?? "pending"),
    original: parseObject(row.original_json),
    proposal: parseObject(row.proposed_json),
    requesterNote: String(row.requester_note ?? ""),
    reviewerEmail: row.reviewer_email ? String(row.reviewer_email) : null,
    reviewNote: String(row.review_note ?? ""),
    createdAt: String(row.created_at ?? ""),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
  };
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const includeArchived = new URL(request.url).searchParams.get("archived") === "1";
    const [groups, rows, stats] = await Promise.all([
      groupsForProfile(profile),
      listDirectoryChanges(profile, includeArchived),
      dashboardStats(profile),
    ]);
    return Response.json({ groups, changes: rows.map(serializeChange), stats }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const groupId = Number(body.groupId);
    if (!Number.isInteger(groupId) || groupId < 1) throw new PortalError("Selecciona un grupo válido.");
    const proposal = body.proposal && typeof body.proposal === "object"
      ? body.proposal as Record<string, unknown>
      : {};
    const result = await submitDirectoryChange(profile, { groupId, proposal, note: String(body.note ?? "") });
    return Response.json(result, { status: 201 });
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
      return Response.json(await archiveDirectoryChange(profile, { id: String(body.id ?? ""), archived: action === "archive" }));
    }
    const result = await reviewDirectoryChange(profile, {
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
    return Response.json(await deleteDirectoryChange(profile, {
      id: String(body.id ?? ""),
      confirmation: String(body.confirmation ?? ""),
    }));
  } catch (error) {
    return apiError(error);
  }
}
