import { createRecognition, deleteRecognition, listRecognitions, updateRecognition } from "../../../lib/recognition-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    return Response.json(await listRecognitions(profile), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    return Response.json(await createRecognition(profile, await readJson(request)), { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    return Response.json(await updateRecognition(profile, await readJson(request)));
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { profile } = await requireApiProfile();
    return Response.json(await deleteRecognition(profile, await readJson(request)));
  } catch (error) { return apiError(error); }
}
