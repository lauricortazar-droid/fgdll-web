import { listPublicCenters, resubmitCenterRequest, submitCenterRegistration } from "../../lib/center-store";
import { apiError, readJson, requireApiUser, requireSameOrigin } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ centers: await listPublicCenters() }, { headers: { "cache-control": "public, max-age=60" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    const result = await submitCenterRegistration(user, await readJson(request));
    return Response.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    return Response.json(await resubmitCenterRequest(user, await readJson(request)));
  } catch (error) { return apiError(error); }
}
