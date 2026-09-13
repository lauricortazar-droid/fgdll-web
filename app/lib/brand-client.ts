export type BrandResource={id:string; name:string; kind:'logo'|'font'; revision:number; fileName:string; url:string};
export async function brandJson(response:Response){const data=await response.json();if(!response.ok)throw new Error(data.error || 'No se pudo completar la operación.');return data;}
const loaded=new Map<string,Promise<string>>();
export function loadBrandFont(resource:BrandResource):Promise<string>{
 const key=resource.url;
 if(!loaded.has(key)){
  const family='Brand_'+resource.id.replace(/[^a-zA-Z0-9]/g,'_')+'_'+resource.revision;
  loaded.set(key,(async()=>{const face=new FontFace(family,`url("${resource.url}")`);await face.load();document.fonts.add(face);return family;})().catch(e=>{loaded.delete(key);throw e;}));
 }
 return loaded.get(key)!;
}
