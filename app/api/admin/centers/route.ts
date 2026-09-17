import { archiveCenterAsAdmin, listCentersForAdmin, restoreCenterAsAdmin, updateCenterAsAdmin } from "../../../lib/center-admin-store";
import { listCenterRequests, reviewCenterRequest } from "../../../lib/center-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    const [requests, centers] = await Promise.all([
      listCenterRequests(profile),
      listCentersForAdmin(profile),
    ]);
    return Response.json({ requests, centers }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    if (String(body.mode ?? "") === "center") {
      if (String(body.action ?? "") === "restore") {
        return Response.json(await restoreCenterAsAdmin(profile, body));
      }
      return Response.json(await updateCenterAsAdmin(profile, body));
    }
    return Response.json(await reviewCenterRequest(profile, {
      id: String(body.id ?? ""),
      action: String(body.action ?? ""),
      note: String(body.note ?? ""),
    }));
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    return Response.json(await archiveCenterAsAdmin(profile, body));
  } catch (error) { return apiError(error); }
}
