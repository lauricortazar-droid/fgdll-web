import { apiError } from "../../../lib/portal-api";
import { listUniversityContent } from "../../../lib/university-store";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await listUniversityContent(), { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } }); }
  catch (error) { return apiError(error); }
}
