import { listBrandResources, saveBrandResource, deleteBrandResource, requireBrandAdmin } from '../../lib/brand-store';
import { apiError, requireApiProfile, requireSameOrigin, readJson } from '../../lib/portal-api';
import { PortalError } from '../../lib/directory-store';
export const dynamic='force-dynamic';
export async function GET() { try { return Response.json({resources:await listBrandResources()},{headers:{'cache-control':'no-store'}}); } catch(e) { return apiError(e); } }
export async function POST(request:Request) { try {
  requireSameOrigin(request); const {profile}=await requireApiProfile(); requireBrandAdmin(profile);
  if(Number(request.headers.get('content-length'))>11*1024*1024) throw new PortalError('Archivo demasiado grande.',413);
  return Response.json(await saveBrandResource(profile,await request.formData()));
} catch(e) { return apiError(e); } }
export async function DELETE(request:Request) { try {
  requireSameOrigin(request); const {profile}=await requireApiProfile(); requireBrandAdmin(profile);
  return Response.json(await deleteBrandResource(profile,await readJson(request)));
} catch(e) { return apiError(e); } }
