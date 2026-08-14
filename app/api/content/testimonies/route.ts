import { getPortalProfile, PortalError } from "../../../lib/directory-store";
import {
  deleteTestimonyTopic,
  listTestimonyTopics,
  saveTestimonyTopic,
} from "../../../lib/content-store";
import { apiError, readJson, requireApiProfile, requireApiUser, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

function parsePayload(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function serialize(row: Record<string, unknown>) {
  const payload = parsePayload(row.payload_json);
  return {
    ...payload,
    id: String(row.id),
    titulo: String(row.title ?? payload.titulo ?? ""),
    categoria: String(row.category ?? payload.categoria ?? "General"),
    intensidad: String(row.intensity ?? payload.intensidad ?? "Media"),
    momento: String(row.moment ?? payload.momento ?? "Mitad"),
    objetivo: String(row.objective ?? payload.objetivo ?? ""),
    fraseAncla: String(row.anchor ?? payload.fraseAncla ?? ""),
    status: String(row.status ?? "published"),
    origin: String(row.origin ?? "upload"),
    fileName: String(row.file_name ?? ""),
    fileType: String(row.file_type ?? ""),
    fileSize: Number(row.file_size ?? 0),
    fileUrl: row.file_key ? `/api/content/files?kind=testimony&id=${encodeURIComponent(String(row.id))}` : null,
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
    const rows = await listTestimonyTopics(profile ?? undefined, adminView);
    return Response.json({ topics: rows.map(serialize) }, { headers: { "cache-control": "private, no-store" } });
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
    const result = await saveTestimonyTopic(profile, formInput(form), file);
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
    const result = await deleteTestimonyTopic(profile, String(body.id ?? ""), String(body.confirmation ?? ""));
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
