import compactConsent from "../../private-assets/materiales/hoja-responsiva-fgdll-2026-compacta.pdf?inline";
import fullConsent from "../../private-assets/materiales/hoja-responsiva-fgdll-2026-completa.pdf?inline";
import anniversaryProtocol from "../../private-assets/materiales/protocolo-aniversarios.pdf?inline";
import dailyProtocol from "../../private-assets/materiales/protocolo-sesion-diaria.pdf?inline";
import anniversaryPreview from "../../private-assets/materiales/protocolo-aniversarios.png?inline";
import dailyPreview from "../../private-assets/materiales/protocolo-sesion-diaria.png?inline";
import compactPreview from "../../private-assets/materiales/responsiva-compacta-2026.png?inline";
import fullPreview from "../../private-assets/materiales/responsiva-completa-2026.png?inline";
import { PortalError } from "../../lib/directory-store";
import { apiError, requireApiProfile } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

const assets: Record<string, { dataUrl: string; filename: string; contentType: string }> = {
  "protocolo-sesion-diaria": { dataUrl: dailyProtocol, filename: "protocolo-sesion-diaria.pdf", contentType: "application/pdf" },
  "protocolo-sesion-diaria-preview": { dataUrl: dailyPreview, filename: "protocolo-sesion-diaria.png", contentType: "image/png" },
  "protocolo-aniversarios": { dataUrl: anniversaryProtocol, filename: "protocolo-aniversarios.pdf", contentType: "application/pdf" },
  "protocolo-aniversarios-preview": { dataUrl: anniversaryPreview, filename: "protocolo-aniversarios.png", contentType: "image/png" },
  "responsiva-completa-2026": { dataUrl: fullConsent, filename: "hoja-responsiva-fgdll-2026-completa.pdf", contentType: "application/pdf" },
  "responsiva-completa-2026-preview": { dataUrl: fullPreview, filename: "responsiva-completa-2026.png", contentType: "image/png" },
  "responsiva-compacta-2026": { dataUrl: compactConsent, filename: "hoja-responsiva-fgdll-2026-compacta.pdf", contentType: "application/pdf" },
  "responsiva-compacta-2026-preview": { dataUrl: compactPreview, filename: "responsiva-compacta-2026.png", contentType: "image/png" },
};

function decodeDataUrl(value: string) {
  const comma = value.indexOf(",");
  if (comma < 0) throw new PortalError("El archivo privado no pudo prepararse.", 500);
  const binary = atob(value.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function GET(request: Request) {
  try {
    await requireApiProfile();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const asset = assets[id];
    if (!asset) throw new PortalError("El archivo solicitado no existe.", 404);
    const body = decodeDataUrl(asset.dataUrl);
    return new Response(body, {
      headers: {
        "content-type": asset.contentType,
        "content-length": String(body.byteLength),
        "content-disposition": `inline; filename="${asset.filename}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
