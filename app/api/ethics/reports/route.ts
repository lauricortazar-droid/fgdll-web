import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";
import { submitEthicsReport } from "../../../lib/ethics-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireApiProfile();
    return Response.json(await submitEthicsReport(await readJson(request)), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
