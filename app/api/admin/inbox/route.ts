import { listAdminInbox } from "../../../lib/admin-inbox-store";
import { apiError, requireApiProfile } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    return Response.json(await listAdminInbox(profile), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
