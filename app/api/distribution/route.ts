import {
  deleteDistributionWorkspace,
  getDistributionWorkspace,
  saveDistributionWorkspace,
} from "../../lib/distribution-store";
import {
  apiError,
  readJson,
  requireApiProfile,
  requireSameOrigin,
} from "../../lib/portal-api";

export const dynamic = "force-dynamic";

const privateHeaders = { "cache-control": "private, no-store" };

export async function GET() {
  try {
    const { user } = await requireApiProfile();
    const workspace = await getDistributionWorkspace(user.email);
    return Response.json(workspace, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiProfile();
    const body = await readJson(request);
    const revision = typeof body.revision === "number" ? body.revision : undefined;
    const workspace = await saveDistributionWorkspace(user.email, body.state, revision);
    return Response.json(workspace, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiProfile();
    await deleteDistributionWorkspace(user.email);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

