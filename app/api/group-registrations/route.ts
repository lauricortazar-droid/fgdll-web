import { listGroupRegistrations, resubmitGroupRegistration, reviewGroupRegistration, submitGroupRegistration } from "../../lib/group-registration-store";
import { apiError, readJson, requireApiProfile, requireSameOrigin } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

function parseObject(value: unknown) {
  try { const parsed = JSON.parse(String(value ?? "{}")); return parsed && typeof parsed === "object" ? parsed : {}; }
  catch { return {}; }
}

function serialize(row: Record<string, unknown>) {
  return { id: String(row.id), requesterEmail: String(row.requester_email), requesterName: String(row.requester_name ?? ""), requesterRole: String(row.requester_role), zone: String(row.zone), proposal: parseObject(row.proposed_json), requesterNote: String(row.requester_note ?? ""), status: String(row.status), reviewerEmail: row.reviewer_email ? String(row.reviewer_email) : null, reviewNote: String(row.review_note ?? ""), createdGroupId: row.created_group_id == null ? null : Number(row.created_group_id), createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? "") };
}

export async function GET() {
  try { const { profile } = await requireApiProfile(); return Response.json({ requests: (await listGroupRegistrations(profile)).map(serialize), profile }, { headers: { "cache-control": "private, no-store" } }); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try { requireSameOrigin(request); const { profile } = await requireApiProfile(); const body = await readJson(request); return Response.json(await submitGroupRegistration(profile, (body.proposal && typeof body.proposal === "object" ? body.proposal : {}) as Record<string, unknown>, body.note), { status: 201 }); }
  catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request); const { profile } = await requireApiProfile(); const body = await readJson(request);
    if (String(body.action) === "resubmit") return Response.json(await resubmitGroupRegistration(profile, String(body.id ?? ""), (body.proposal && typeof body.proposal === "object" ? body.proposal : {}) as Record<string, unknown>, body.note));
    return Response.json(await reviewGroupRegistration(profile, String(body.id ?? ""), String(body.action ?? ""), body.note));
  } catch (error) { return apiError(error); }
}
