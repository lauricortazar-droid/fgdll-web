'use client';

export type SessionLogoResource={
  id:string;
  name:string;
  dataUrl:string;
  type:string;
  createdAt:number;
};

const KEY='fgdll:session-logos:v1';
const MAX_ITEMS=12;
const MAX_FILE_BYTES=2_000_000;
const MAX_TOTAL_CHARS=8_000_000;

function safeParse(value:string|null):SessionLogoResource[]{
  if(!value)return[];
  try{
    const parsed=JSON.parse(value);
    if(!Array.isArray(parsed))return[];
    return parsed.filter((item):item is SessionLogoResource=>
      !!item&&typeof item.id==='string'&&typeof item.name==='string'&&typeof item.dataUrl==='string'
    );
  }catch{return[]}
}

export function readSessionLogos():SessionLogoResource[]{
  if(typeof window==='undefined')return[];
  return safeParse(window.sessionStorage.getItem(KEY));
}

function persist(items:SessionLogoResource[]){
  if(typeof window==='undefined')return;
  window.sessionStorage.setItem(KEY,JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('fgdll:session-logos-changed',{detail:items}));
}

function fileToDataUrl(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export async function addSessionLogoFiles(files:FileList|File[]):Promise<{items:SessionLogoResource[];warnings:string[]}>{
  const incoming=Array.from(files);
  const warnings:string[]=[];
  let items=readSessionLogos();

  for(const file of incoming){
    if(!['image/png','image/webp'].includes(file.type)){
      warnings.push(`${file.name}: usa PNG o WebP. PNG es lo recomendado para transparencia.`);
      continue;
    }
    if(file.size>MAX_FILE_BYTES){
      warnings.push(`${file.name}: supera 2 MB y no se guardó en la sesión.`);
      continue;
    }
    if(items.length>=MAX_ITEMS){
      warnings.push(`Se alcanzó el máximo de ${MAX_ITEMS} recursos subidos por sesión.`);
      break;
    }
    try{
      const dataUrl=await fileToDataUrl(file);
      const candidate:SessionLogoResource={
        id:`session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        name:file.name.replace(/\.[^.]+$/,''),
        dataUrl,
        type:file.type,
        createdAt:Date.now()
      };
      const next=[...items,candidate];
      if(JSON.stringify(next).length>MAX_TOTAL_CHARS){
        warnings.push(`${file.name}: no se guardó porque la memoria de sesión está llena.`);
        break;
      }
      items=next;
    }catch{
      warnings.push(`${file.name}: no se pudo leer.`);
    }
  }

  try{persist(items)}catch{
    warnings.push('El navegador no permitió guardar todos los recursos durante la sesión.');
  }
  return{items,warnings};
}

export function removeSessionLogo(id:string):SessionLogoResource[]{
  const items=readSessionLogos().filter(item=>item.id!==id);
  try{persist(items)}catch{}
  return items;
}

export function clearSessionLogos(){
  try{persist([])}catch{}
}
