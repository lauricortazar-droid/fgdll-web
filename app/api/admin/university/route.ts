import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";
import { addUniversityUser, listUniversityAdmin, updateUniversityRecord } from "../../../lib/university-store";

export const dynamic = "force-dynamic";
export async function GET() {
  try { const { profile } = await requireApiProfile(); return Response.json(await listUniversityAdmin(profile), { headers: { "cache-control": "private, no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try { requireSameOrigin(request); const { profile } = await requireApiProfile(); return Response.json(await addUniversityUser(profile, await readJson(request)), { status: 201 }); }
  catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try { requireSameOrigin(request); const { profile } = await requireApiProfile(); return Response.json(await updateUniversityRecord(profile, await readJson(request))); }
  catch (error) { return apiError(error); }
}
