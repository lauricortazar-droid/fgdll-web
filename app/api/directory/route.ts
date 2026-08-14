import { listDirectoryGroups } from "../../lib/directory-store";
import { apiError } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await listDirectoryGroups();
    return Response.json({ groups }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return apiError(error);
  }
}
