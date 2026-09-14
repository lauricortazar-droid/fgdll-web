import {
  archiveAnnouncementRead,
  deleteAnnouncement,
  listAnnouncements,
  markAnnouncementRead,
  saveAnnouncement,
} from "../../lib/content-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

function serialize(row: Record<string, unknown>) {
  const revision = Number(row.revision ?? 1);
  const readRevision = Number(row.read_revision ?? 0);
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    body: String(row.body ?? ""),
    priority: String(row.priority ?? "info"),
    audience: String(row.audience ?? "all"),
    status: String(row.status ?? "draft"),
    revision,
    unread: readRevision < revision,
    createdBy: String(row.created_by ?? ""),
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const adminView = new URL(request.url).searchParams.get("admin") === "1";
    const rows = await listAnnouncements(profile, adminView);
    return Response.json({ announcements: rows.map(serialize) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const input = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value ?? "")])) as Record<string, string>;
    const result = await saveAnnouncement(profile, input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const input = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value ?? "")])) as Record<string, string>;
    const result = await saveAnnouncement(profile, input);
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const action = String(body.action ?? "");
    if (action === "archive" || action === "delete") {
      return Response.json(await archiveAnnouncementRead(profile, String(body.id ?? "")));
    }
    const result = await markAnnouncementRead(profile, String(body.id ?? ""));
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const result = await deleteAnnouncement(profile, String(body.id ?? ""), String(body.confirmation ?? ""));
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
