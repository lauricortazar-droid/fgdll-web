import { listPortalUsers, savePortalUser } from "../../../lib/directory-store";
import { apiError, readJson, requireApiProfile } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

function serializeUser(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? row.email ?? ""),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    role: String(row.role ?? "pending"),
    zone: row.zone ? String(row.zone) : null,
    groupId: row.group_id == null ? null : Number(row.group_id),
    groupName: String(row.group_name ?? ""),
    active: Boolean(Number(row.active ?? 0)),
    notes: String(row.notes ?? ""),
    source: String(row.source ?? "manual"),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    systemManaged: Boolean(Number(row.system_managed ?? 0)),
  };
}

export async function GET() {
  try {
    const { profile } = await requireApiProfile();
    const rows = await listPortalUsers(profile);
    const users = rows.map(serializeUser);
    return Response.json({
      users,
      stats: {
        total: users.length,
        active: users.filter((user) => user.active).length,
        incomplete: users.filter((user) => user.role === "pending").length,
      },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

async function save(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const body = await readJson(request);
    const result = await savePortalUser(profile, {
      email: String(body.email ?? ""),
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      role: String(body.role ?? ""),
      zone: String(body.zone ?? ""),
      groupId: body.groupId ? Number(body.groupId) : null,
      notes: String(body.notes ?? ""),
      active: body.active === true,
    });
    return Response.json(result, { status: 200 });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  return save(request);
}

export async function PATCH(request: Request) {
  return save(request);
}
