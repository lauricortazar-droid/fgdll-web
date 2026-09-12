import { listAdminInbox, markAdminInboxRead } from "../../../lib/admin-inbox-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    return Response.json(await listAdminInbox(profile), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    return Response.json(await markAdminInboxRead(profile, String(body.itemKey ?? ""), String(body.sourceUpdatedAt ?? "")));
  } catch (error) {
    return apiError(error);
  }
}
