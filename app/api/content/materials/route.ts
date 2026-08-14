import { getPortalProfile, PortalError } from "../../../lib/directory-store";
import {
  deleteLeaderMaterial,
  listLeaderMaterials,
  saveLeaderMaterial,
} from "../../../lib/content-store";
import { apiError, readJson, requireApiProfile, requireApiUser, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

function serialize(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category: String(row.category ?? "otros"),
    description: String(row.description ?? ""),
    versionLabel: String(row.version_label ?? ""),
    fileName: String(row.file_name ?? ""),
    fileType: String(row.file_type ?? ""),
    fileSize: Number(row.file_size ?? 0),
    status: String(row.status ?? "published"),
    sortOrder: Number(row.sort_order ?? 0),
    previewUrl: row.preview_url ? String(row.preview_url) : null,
    fileUrl: row.static_url
      ? String(row.static_url)
      : row.file_key ? `/api/content/files?kind=material&id=${encodeURIComponent(String(row.id))}` : null,
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function formInput(form: FormData) {
  const input: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") input[key] = value;
  }
  return input;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const profile = await getPortalProfile(user.email, user.displayName);
    const adminView = new URL(request.url).searchParams.get("admin") === "1";
    if (adminView && !profile) throw new PortalError("Tu perfil no tiene permisos administrativos.", 403);
    const rows = await listLeaderMaterials(profile ?? undefined, adminView);
    return Response.json({ materials: rows.map(serialize) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

async function save(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const form = await request.formData();
    const fileValue = form.get("file");
    const file = fileValue instanceof File && fileValue.size ? fileValue : null;
    const result = await saveLeaderMaterial(profile, formInput(form), file);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) { return save(request); }
export async function PATCH(request: Request) { return save(request); }

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const result = await deleteLeaderMaterial(profile, String(body.id ?? ""), String(body.confirmation ?? ""));
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
