import { apiError, readJson, requireSameOrigin } from "../../../lib/portal-api";
import { registerCenterBatch } from "../../../lib/university-store";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { requireSameOrigin(request); return Response.json(await registerCenterBatch(await readJson(request)), { status: 201 }); }
  catch (error) { return apiError(error); }
}
