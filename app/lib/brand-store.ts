import "server-only";
import seeds from "./brand-seeds.json";
import { getRuntimeEnv } from "./runtime-env";
import { PortalError, type PortalProfile } from "./directory-store";

export type BrandRow = { id: string; name: string; kind: string; static_url: string | null; file_key: string | null; file_name: string; file_type: string; file_size: number; deleted: number; revision: number };
function db() { const d = getRuntimeEnv().DB; if (!d) throw new PortalError("La galería no está disponible. Inténtalo de nuevo.",503); return d; }
function bucket() { const b = getRuntimeEnv().BUCKET; if (!b) throw new PortalError("El almacenamiento no está disponible.",503); return b; }
function pngHasTransparency(bytes: Uint8Array, view: DataView) {
  const colorType = bytes[25];
  if (colorType === 4 || colorType === 6) return true;
  for (let pos = 8; pos + 12 <= bytes.length;) {
    const length = view.getUint32(pos);
    if (pos + 12 + length > bytes.length) return false;
    const type = String.fromCharCode(bytes[pos+4],bytes[pos+5],bytes[pos+6],bytes[pos+7]);
    if (type === "tRNS") return true;
    pos += 12 + length;
  }
  return false;
}
export function requireBrandAdmin(profile: PortalProfile) { if (profile.role !== "admin") throw new PortalError("Solo administración puede modificar la galería.",403); }
export async function brandRow(id: string): Promise<BrandRow | null> {
  return await db().prepare("SELECT * FROM brand_resources WHERE id = ?").bind(id).first<BrandRow>() ?? seeds.find(x=>x.id===id) ?? null;
}
export async function listBrandResources() {
  const result = await db().prepare("SELECT * FROM brand_resources").all<BrandRow>();
  const rows = new Map<string,BrandRow>(seeds.map(x=>[x.id,x]));
  for (const row of result.results ?? []) rows.set(row.id,row);
  return [...rows.values()].filter(x=>!x.deleted).map(x=>({id:x.id,name:x.name,kind:x.kind,revision:x.revision,fileName:x.file_name,url:x.kind==='text'?'':`/api/brand/file?id=${encodeURIComponent(x.id)}&v=${x.revision}`,content:x.kind==='text'?x.file_name:undefined}));
}
export async function validateBrandFile(file: File, kind: string) {
  if (!file.size || file.size > 10*1024*1024) throw new PortalError("El archivo debe pesar entre 1 byte y 10 MB.");
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = String.fromCharCode(...bytes.slice(0,4));
  const allowed = kind === 'logo' ? ext === 'png' && [137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x) :
    (ext === 'ttf' && (sig === '\0\x01\0\0' || sig === 'true')) || (ext === 'otf' && sig === 'OTTO') || (ext === 'woff' && sig === 'wOFF') || (ext === 'woff2' && sig === 'wOF2');
  if (!allowed) throw new PortalError("Archivo no válido. Usa PNG para logos o TTF, OTF, WOFF y WOFF2 para tipografías.");
  if(kind==='logo') {
    if(bytes.length<24) throw new PortalError('PNG incompleto.');
    const v=new DataView(bytes.buffer); const w=v.getUint32(16), h=v.getUint32(20);
    if(!w || !h || w*h>40000000) throw new PortalError('El PNG debe tener como máximo 40 megapíxeles.');
    if(!pngHasTransparency(bytes,v)) throw new PortalError('El logotipo debe ser PNG sin fondo, con transparencia.');
  }
  return {bytes, contentType:kind==='logo'?'image/png':`font/${ext}`, filename:file.name.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-180)};
}
async function write(row: BrandRow, profile: PortalProfile, expected?: number) {
  const d=db();
  // Revision check and mutation are one statement so concurrent editors cannot overwrite each other.
  const result=await d.prepare(`INSERT INTO brand_resources (id,name,kind,static_url,file_key,file_name,file_type,file_size,deleted,revision,updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,static_url=excluded.static_url,file_key=excluded.file_key,file_name=excluded.file_name,file_type=excluded.file_type,file_size=excluded.file_size,deleted=excluded.deleted,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP WHERE brand_resources.revision = ?`).bind(row.id,row.name,row.kind,row.static_url,row.file_key,row.file_name,row.file_type,row.file_size,row.deleted,row.revision,profile.email,expected ?? 0).run();
  if(result.meta.changes===0) throw new PortalError('Otra persona modificó el recurso. Actualiza la galería e inténtalo de nuevo.',409);
}
export async function saveBrandResource(profile: PortalProfile, form: FormData) {
  requireBrandAdmin(profile);
  const id=String(form.get('id') || ''), name=String(form.get('name') || '').trim();
  if(!name || name.length>100) throw new PortalError('Escribe un nombre de hasta 100 caracteres.');
  const existing=id ? await brandRow(id) : null;
  if(id && (!existing || existing.deleted)) throw new PortalError('El recurso ya no existe.',404);
  if(existing && Number(form.get('revision'))!==existing.revision) throw new PortalError('El recurso cambió. Actualiza la galería.',409);
  const kind=existing?.kind ?? String(form.get('kind'));
  if(!['logo','font','text'].includes(kind)) throw new PortalError('Selecciona logo, tipografía o texto.');
  const textValue=String(form.get('text') || '').trim();
  const fileValue=form.get('file'); const file=fileValue instanceof File && fileValue.size ? fileValue : null;
  if(kind==='text') {
    if(!textValue || textValue.length>240) throw new PortalError('Escribe un texto de hasta 240 caracteres.');
    if(file) throw new PortalError('Los textos predeterminados no requieren archivo.');
  } else if(!existing && !file) throw new PortalError('Selecciona un archivo.');
  const next:BrandRow=existing ? {...existing,name,revision:existing.revision+1} : {id:crypto.randomUUID(),name,kind,static_url:null,file_key:null,file_name:'',file_type:'',file_size:0,deleted:0,revision:1};
  let uploaded:string|null=null;
  if(kind==='text') {
    Object.assign(next,{file_key:null,static_url:null,file_name:textValue,file_type:'text/plain',file_size:new TextEncoder().encode(textValue).length});
  } else if(file) {
    const validated=await validateBrandFile(file,kind);
    uploaded=`brand/${next.id}/${crypto.randomUUID()}`;
    await bucket().put(uploaded,validated.bytes,{httpMetadata:{contentType:validated.contentType}});
    Object.assign(next,{file_key:uploaded,static_url:null,file_name:validated.filename,file_type:validated.contentType,file_size:file.size});
  }
  try { await write(next,profile,existing?.revision); }
  catch(error) { if(uploaded) await bucket().delete(uploaded).catch(()=>{}); throw error; }
  if(uploaded && existing?.file_key) await bucket().delete(existing.file_key).catch(error=>console.error('brand cleanup',error));
  return {id:next.id};
}
export async function deleteBrandResource(profile:PortalProfile,input:Record<string,unknown>) {
  requireBrandAdmin(profile); const row=await brandRow(String(input.id || ''));
  if(!row || row.deleted) throw new PortalError('El recurso ya no existe.',404);
  if(input.confirmation!==row.name) throw new PortalError('Confirma el nombre del recurso.');
  if(Number(input.revision)!==row.revision) throw new PortalError('El recurso cambió. Actualiza la galería.',409);
  await write({...row,deleted:1,revision:row.revision+1,file_key:null},profile,row.revision);
  if(row.file_key) await bucket().delete(row.file_key).catch(error=>console.error('brand cleanup',error));
  return {deleted:true};
}
export async function brandFile(id:string,request:Request) {
  const row=await brandRow(id);
  if(!row || row.deleted) throw new PortalError('Recurso no disponible.',404);
  if(row.kind==='text') throw new PortalError('Este recurso es un texto y no tiene archivo.',404);
  if(row.static_url) return new Response(null,{status:307,headers:{location:new URL(row.static_url,request.url).href,'cache-control':'no-store'}});
  if(!row.file_key) throw new PortalError('Archivo no disponible.',404);
  const object=await bucket().get(row.file_key);
  if(!object) throw new PortalError('Archivo no disponible.',404);
  return new Response(object.body,{headers:{'content-type':row.file_type,'content-length':String(object.size),'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
