import {
  deleteDistributionWorkspace,
  getDistributionWorkspace,
  saveDistributionWorkspace,
} from "../../lib/distribution-store";
import {
  isAdminEmail,
  PortalError,
} from "../../lib/directory-store";
import {
  apiError,
  readJson,
  requireApiProfile,
  requireSameOrigin,
} from "../../lib/portal-api";

export const dynamic = "force-dynamic";

const privateHeaders = { "cache-control": "private, no-store" };

function requireAdmin(profile: { role: string; email: string }) {
  if (profile.role !== "admin" && !isAdminEmail(profile.email)) {
    throw new PortalError("Mensajería solo está disponible para administración.", 403);
  }
}

export async function GET() {
  try {
    const { user, profile } = await requireApiProfile();
    requireAdmin(profile);
    const workspace = await getDistributionWorkspace(user.email);
    return Response.json(workspace, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { user, profile } = await requireApiProfile();
    requireAdmin(profile);
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
    const { user, profile } = await requireApiProfile();
    requireAdmin(profile);
    await deleteDistributionWorkspace(user.email);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
