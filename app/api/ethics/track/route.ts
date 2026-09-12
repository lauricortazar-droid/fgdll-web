import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";
import { trackEthicsReport } from "../../../lib/ethics-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireApiProfile();
    return Response.json(await trackEthicsReport(await readJson(request)), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
