import {
  apiError,
  readJson,
  requireApiProfile,
  requireSameOrigin,
} from "../../lib/portal-api";
import {
  listOrientationRequests,
  submitOrientationRequest,
  updateOrientationRequest,
} from "../../lib/orientation-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(
      await submitOrientationRequest(await readJson(request)),
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    return Response.json(await listOrientationRequests(profile), {
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
    return Response.json(
      await updateOrientationRequest(profile, await readJson(request)),
    );
  } catch (error) {
    return apiError(error);
  }
}
