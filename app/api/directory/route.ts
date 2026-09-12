import { listDirectoryGroups } from "../../lib/directory-store";
import { apiError } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await listDirectoryGroups();
    const zoneCodes: Record<string, string> = {
      Jaguar: "JAG", "Tiburón": "TIB", "Delfín": "DEL", "Colibrí": "COL", "Águila": "AGU",
    };
    const publicGroups = groups.map((group) => ({
      id: group.id,
      publicCode: `FGDLL-${zoneCodes[group.zone] ?? "GRP"}-${String(group.id).padStart(3, "0")}`,
      zone: group.zone,
      name: group.name,
      city: group.city,
      whatsapp: group.whatsapp,
      facebook: group.facebook,
      address: group.address,
      mapsUrl: group.mapsUrl,
      schedules: group.schedules,
      sessionTypes: group.sessionTypes,
      status: group.status,
      verifiedAt: group.verifiedAt,
    }));
    return Response.json({ groups: publicGroups }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return apiError(error);
  }
}
