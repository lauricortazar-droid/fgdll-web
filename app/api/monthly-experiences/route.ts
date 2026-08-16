import { deleteMonthlyExperience, listMonthlyExperiences, saveMonthlyExperience } from "../../lib/experience-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

function serialize(row: Record<string, unknown>) {
  let writings: string[] = [];
  try { writings = JSON.parse(String(row.writings_json ?? "[]")); } catch { writings = []; }
  return {
    id: String(row.id), month: String(row.month), zone: String(row.zone), title: String(row.title),
    startDate: String(row.start_date), endDate: String(row.end_date), location: String(row.location ?? ""),
    writings, notes: String(row.notes ?? ""), status: String(row.status ?? "published"), updatedAt: String(row.updated_at ?? ""),
  };
}

export async function GET(request: Request) {
  try {
    const adminView = new URL(request.url).searchParams.get("admin") === "1";
    const profile = adminView ? (await requireApiProfile()).profile : undefined;
    const rows = await listMonthlyExperiences(profile, adminView);
    return Response.json({ experiences: rows.map(serialize) }, { headers: { "cache-control": adminView ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const input = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, Array.isArray(value) ? value.join("\n") : String(value ?? "")])) as Record<string, string>;
    return Response.json(await saveMonthlyExperience(profile, input), { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const input = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, Array.isArray(value) ? value.join("\n") : String(value ?? "")])) as Record<string, string>;
    return Response.json(await saveMonthlyExperience(profile, input));
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    return Response.json(await deleteMonthlyExperience(profile, String(body.id ?? ""), String(body.confirmation ?? "")));
  } catch (error) { return apiError(error); }
}
