import { deleteDirectoryGroup, PortalError } from "../../../lib/directory-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) throw new PortalError("Selecciona un grupo válido.");
    const result = await deleteDirectoryGroup(profile, { id, confirmation: String(body.confirmation ?? "") });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
