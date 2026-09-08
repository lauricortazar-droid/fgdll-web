import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";
import { listEthicsReports, updateEthicsReport } from "../../../lib/ethics-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    return Response.json(await listEthicsReports(profile), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    return Response.json(await updateEthicsReport(profile, await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
