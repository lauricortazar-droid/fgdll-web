import { getContentFile } from "../../../lib/content-store";
import { PortalError } from "../../../lib/directory-store";
import { apiError, requireApiProfile } from "../../../lib/portal-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { profile } = await requireApiProfile();
    const url = new URL(request.url);
    const kindValue = url.searchParams.get("kind");
    const id = url.searchParams.get("id") ?? "";
    if (kindValue !== "testimony" && kindValue !== "material") throw new PortalError("Tipo de archivo no válido.");
    if (!id) throw new PortalError("No se indicó el archivo solicitado.");
    const file = await getContentFile(profile, kindValue, id);
    if ("staticUrl" in file) return Response.redirect(new URL(String(file.staticUrl), request.url), 307);
    const headers = new Headers({
      "content-type": file.contentType,
      "content-length": String(file.size),
      "content-disposition": `inline; filename="${file.filename}"`,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    });
    if (file.etag) headers.set("etag", file.etag);
    return new Response(file.body, { headers });
  } catch (error) {
    return apiError(error);
  }
}
