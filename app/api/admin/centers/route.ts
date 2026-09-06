import { listCenterRequests, reviewCenterRequest } from "../../../lib/center-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    return Response.json({ requests: await listCenterRequests(profile) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    return Response.json(await reviewCenterRequest(profile, { id: String(body.id ?? ""), action: String(body.action ?? ""), note: String(body.note ?? "") }));
  } catch (error) { return apiError(error); }
}
