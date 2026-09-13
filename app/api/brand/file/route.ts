import { brandFile } from '../../../lib/brand-store';
import { apiError } from '../../../lib/portal-api';
export const dynamic='force-dynamic';
export async function GET(request:Request) {try {return await brandFile(new URL(request.url).searchParams.get('id') || '',request);}catch(e){return apiError(e);}}
