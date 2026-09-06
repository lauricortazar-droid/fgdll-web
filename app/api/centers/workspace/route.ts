import { getCenterWorkspace, submitCenterChange } from "../../../lib/center-store";
import { getPortalProfile } from "../../../lib/directory-store";
import { apiError, readJson, requireApiUser, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();
    const profile = await getPortalProfile(user.email, user.displayName);
    return Response.json({ identity: user, profile, ...(await getCenterWorkspace(user.email, profile)) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    const profile = await getPortalProfile(user.email, user.displayName);
    return Response.json(await submitCenterChange(user, profile, await readJson(request)), { status: 201 });
  } catch (error) { return apiError(error); }
}
