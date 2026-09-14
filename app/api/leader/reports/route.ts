import { submitLeaderReport } from "../../../lib/leader-report-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    return Response.json(await submitLeaderReport(profile, body), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
