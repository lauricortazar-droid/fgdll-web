import {
  ADMIN_CONTACT_EMAIL,
  dashboardStats,
  getPortalProfile,
  groupsForProfile,
  roleLabel,
} from "../../../lib/directory-store";
import { apiError, requireApiUser } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();
    const profile = await getPortalProfile(user.email, user.displayName);
    const [groups, stats] = profile
      ? await Promise.all([groupsForProfile(profile), dashboardStats(profile)])
      : [[], { groups: 0, pendingChanges: 0, pendingAccess: 0 }];

    return Response.json({
      identity: user,
      profile: profile ? { ...profile, roleLabel: roleLabel(profile.role) } : null,
      groups,
      stats,
      adminContact: ADMIN_CONTACT_EMAIL,
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
