'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type PointerEvent as PE} from 'react';
import {brandJson,loadBrandFont,type BrandResource} from '../../lib/brand-client';
import {addSessionLogoFiles,readSessionLogos,removeSessionLogo,type SessionLogoResource} from '../../lib/session-logo-resources';
import './editor.css';

type Picture={el:HTMLImageElement;name:string;width:number;height:number};
type Transform={x:number;y:number;size:number;opacity:number;rotation:number};
type LogoLayer={id:string;name:string;sourceId:string;picture:Picture;transform:Transform;visible:boolean};
type Selected={kind:'logo';id:string}|{kind:'text'};
type Gesture={
 mode:'drag'|'pinch';
 selected:Selected;
 pointerIds:number[];
 startCenter:{x:number;y:number};
 startDistance:number;
 startAngle:number;
 start:Transform;
 dragOffset:{x:number;y:number};
};

const initialLogo=(index=0):Transform=>({x:.78-(index%3)*.08,y:.78-Math.floor(index/3)*.08,size:.2,opacity:1,rotation:0});
const initialText:Transform={x:.5,y:.88,size:.65,opacity:1,rotation:0};
const positions=['Superior izquierda','Superior centro','Superior derecha','Centro izquierda','Centro','Centro derecha','Inferior izquierda','Inferior centro','Inferior derecha'];

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function makeId(prefix='logo'){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function loadPicture(src:string,name:string):Promise<Picture>{
 return new Promise((resolve,reject)=>{
  const el=new Image();
  el.onload=()=>el.naturalWidth&&el.naturalHeight?resolve({el,name,width:el.naturalWidth,height:el.naturalHeight}):reject(new Error('Imagen sin dimensiones válidas.'));
  el.onerror=()=>reject(new Error('No se pudo abrir la imagen.'));
  el.src=src;
 });
}
function downloadBlob(blob:Blob,name:string){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}

export default function ImageEditor(){
 const [resources,setResources]=useState<BrandResource[]>([]);
 const [sessionLogos,setSessionLogos]=useState<SessionLogoResource[]>([]);
 const [catalogLoading,setCatalogLoading]=useState(true),[catalogError,setCatalogError]=useState(''),[admin,setAdmin]=useState(false);
 const [photo,setPhoto]=useState<Picture|null>(null),[logos,setLogos]=useState<LogoLayer[]>([]);
 const [selected,setSelected]=useState<Selected>({kind:'text'});
 const [text,setText]=useState(''),[textTransform,setTextTransform]=useState(initialText),[color,setColor]=useState('#ffffff');
 const [fontId,setFontId]=useState(''),[family,setFamily]=useState(''),[fontBusy,setFontBusy]=useState(false),[fontError,setFontError]=useState('');
 const [format,setFormat]=useState<'png'|'jpeg'|'webp'>('png'),[quality,setQuality]=useState(.92),[busy,setBusy]=useState(false),[status,setStatus]=useState('Sube una imagen para comenzar.');
 const canvasRef=useRef<HTMLCanvasElement>(null),photoRequest=useRef(0);
 const pointers=useRef(new Map<number,{x:number;y:number}>()),gesture=useRef<Gesture|null>(null);

 useEffect(()=>{
  document.title='Marca de imágenes | FGDLL';
  setSessionLogos(readSessionLogos());
  void refresh();
  fetch('/api/portal/me',{cache:'no-store'}).then(brandJson).then(d=>setAdmin(d.profile?.role==='admin')).catch(()=>{});
 },[]);

 async function refresh(){
  setCatalogLoading(true);setCatalogError('');
  try{
   const d=await fetch('/api/brand',{cache:'no-store'}).then(brandJson);
   setResources(d.resources);
   const font=d.resources.find((r:BrandResource)=>r.id==='brand-ringbearer')??d.resources.find((r:BrandResource)=>r.kind==='font');
   if(font&&!fontId)setFontId(font.id);
  }catch(e){setCatalogError((e as Error).message)}finally{setCatalogLoading(false)}
 }

 const selectedFont=resources.find(r=>r.id===fontId&&r.kind==='font');
 useEffect(()=>{
  let alive=true;setFamily('');setFontError('');
  if(!selectedFont){setFontBusy(false);return}
  setFontBusy(true);
  loadBrandFont(selectedFont).then(f=>{if(alive)setFamily(f)}).catch(()=>{if(alive)setFontError('No se pudo cargar esta tipografía. Selecciona otra.')}).finally(()=>{if(alive)setFontBusy(false)});
  return()=>{alive=false};
 },[selectedFont]);

 const selectedLogo=useMemo(()=>selected.kind==='logo'?logos.find(l=>l.id===selected.id)??null:null,[selected,logos]);
 const activeTransform=selected.kind==='logo'?(selectedLogo?.transform??initialLogo()):textTransform;

 async function uploadBase(file:File|undefined){
  if(!file)return;
  if(!file.type.startsWith('image/')){setStatus('Selecciona un archivo de imagen.');return}
  const n=++photoRequest.current,url=URL.createObjectURL(file);
  try{
   const p=await loadPicture(url,file.name);
   if(n!==photoRequest.current)return;
   setPhoto(p);setStatus(`${p.width} × ${p.height} px. Imagen lista. La transparencia del archivo se conserva.`);
  }catch(e){setStatus((e as Error).message)}finally{URL.revokeObjectURL(url)}
 }

 async function addLogo(src:string,name:string,sourceId:string){
  try{
   const picture=await loadPicture(src,name);
   const layer:LogoLayer={id:makeId(),name,sourceId,picture,transform:initialLogo(logos.length),visible:true};
   setLogos(all=>[...all,layer]);setSelected({kind:'logo',id:layer.id});
   setStatus(`${name} añadido. Puedes moverlo, escalarlo y rotarlo de forma independiente.`);
  }catch(e){setStatus((e as Error).message)}
 }

 async function addUploadedResources(files:FileList|null){
  if(!files?.length)return;
  const result=await addSessionLogoFiles(files);
  setSessionLogos(result.items);
  setStatus(result.warnings.length?result.warnings.join(' '):`${files.length} recurso(s) guardado(s) durante esta sesión.`);
 }

 function removeLayer(id:string){
  setLogos(all=>all.filter(l=>l.id!==id));
  if(selected.kind==='logo'&&selected.id===id)setSelected({kind:'text'});
 }
 function patchLogo(id:string,patch:Partial<LogoLayer>){
  setLogos(all=>all.map(l=>l.id===id?{...l,...patch}:l));
 }
 function patchTransform(patch:Partial<Transform>){
  if(selected.kind==='text'){setTextTransform(t=>({...t,...patch}));return}
  setLogos(all=>all.map(l=>l.id===selected.id?{...l,transform:{...l.transform,...patch}}:l));
 }

 function textLayout(ctx:CanvasRenderingContext2D){
  ctx.font=`200px "${family||'Arial'}"`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
  const lines=text.split('\n').slice(0,6),metrics=lines.map(line=>ctx.measureText(line||' '));
  const ascent=Math.max(200,...metrics.map(m=>m.actualBoundingBoxAscent||0)),descent=Math.max(50,...metrics.map(m=>m.actualBoundingBoxDescent||0));
  const lineHeight=ascent+descent+20,width=Math.max(1,...metrics.map(m=>Math.max(m.width,m.actualBoundingBoxRight||0)+Math.max(0,m.actualBoundingBoxLeft||0)))+40;
  return{lines,metrics,width,height:lineHeight*lines.length+40,lineHeight,ascent};
 }
 function logoDims(layer:LogoLayer,width:number){const w=width*layer.transform.size;return{w,h:w*layer.picture.height/layer.picture.width}}
 function textDims(width:number,ctx:CanvasRenderingContext2D){const w=width*textTransform.size,l=textLayout(ctx);return{w,h:w*l.height/l.width}}

 function drawLogo(ctx:CanvasRenderingContext2D,layer:LogoLayer,w:number,h:number){
  if(!layer.visible)return;
  const d=logoDims(layer,w),t=layer.transform;
  ctx.save();ctx.translate(t.x*w,t.y*h);ctx.rotate(t.rotation*Math.PI/180);ctx.globalAlpha=t.opacity;
  ctx.drawImage(layer.picture.el,-d.w/2,-d.h/2,d.w,d.h);ctx.restore();
 }
 function drawText(ctx:CanvasRenderingContext2D,w:number,h:number){
  if(!text.trim()||!family||fontBusy)return;
  const d=textDims(w,ctx),t=textTransform,l=textLayout(ctx);
  ctx.save();ctx.translate(t.x*w,t.y*h);ctx.rotate(t.rotation*Math.PI/180);ctx.globalAlpha=t.opacity;
  ctx.translate(-d.w/2,-d.h/2);ctx.scale(d.w/l.width,d.w/l.width);ctx.font=`200px "${family}"`;ctx.fillStyle=color;ctx.textBaseline='alphabetic';
  l.lines.forEach((line,i)=>{const m=l.metrics[i],left=Math.max(0,m.actualBoundingBoxLeft||0);ctx.fillText(line,20+left+(l.width-40-m.width-left)/2,20+l.ascent+i*l.lineHeight)});
  ctx.restore();
 }
 function render(ctx:CanvasRenderingContext2D,w:number,h:number,exporting=false){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);
  if(!photo){ctx.restore();return}
  if(exporting&&format==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)}
  ctx.drawImage(photo.el,0,0,w,h);
  logos.forEach(layer=>drawLogo(ctx,layer,w,h));drawText(ctx,w,h);ctx.restore();
 }
 useEffect(()=>{
  const c=canvasRef.current;if(!c||!photo)return;
  const scale=Math.min(1,1600/Math.max(photo.width,photo.height));c.width=Math.round(photo.width*scale);c.height=Math.round(photo.height*scale);
  const ctx=c.getContext('2d',{alpha:true});if(ctx)render(ctx,c.width,c.height);
 },[photo,logos,text,textTransform,color,family,fontBusy,format]);

 function point(e:PE<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}}
 function center(a:{x:number;y:number},b:{x:number;y:number}){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(b.x-a.x,b.y-a.y)}
 function angle(a:{x:number;y:number},b:{x:number;y:number}){return Math.atan2(b.y-a.y,b.x-a.x)}
 function selectedTransform(sel:Selected){if(sel.kind==='text')return textTransform;return logos.find(l=>l.id===sel.id)?.transform??initialLogo()}
 function hitTest(c:HTMLCanvasElement,p:{x:number;y:number}):Selected|null{
  const ctx=c.getContext('2d',{alpha:true});if(!ctx)return null;
  const r=c.getBoundingClientRect(),pad=Math.max(18,28*c.width/Math.max(1,r.width));
  if(text.trim()&&family){
   const d=textDims(c.width,ctx),t=textTransform,a=-t.rotation*Math.PI/180,dx=p.x-t.x*c.width,dy=p.y-t.y*c.height,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
   if(Math.abs(x)<=d.w/2+pad&&Math.abs(y)<=d.h/2+pad)return{kind:'text'};
  }
  for(const layer of [...logos].reverse()){
   if(!layer.visible)continue;
   const d=logoDims(layer,c.width),t=layer.transform,a=-t.rotation*Math.PI/180,dx=p.x-t.x*c.width,dy=p.y-t.y*c.height,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
   if(Math.abs(x)<=d.w/2+pad&&Math.abs(y)<=d.h/2+pad)return{kind:'logo',id:layer.id};
  }
  return null;
 }
 function applyTransform(sel:Selected,patch:Partial<Transform>){
  if(sel.kind==='text'){setTextTransform(t=>({...t,...patch}));return}
  setLogos(all=>all.map(l=>l.id===sel.id?{...l,transform:{...l.transform,...patch}}:l));
 }
 function down(e:PE<HTMLCanvasElement>){
  e.preventDefault();const c=e.currentTarget,p=point(e);pointers.current.set(e.pointerId,p);try{c.setPointerCapture(e.pointerId)}catch{}
  const active=[...pointers.current.entries()];
  if(active.length===1){
   const hit=hitTest(c,p);if(!hit){gesture.current=null;return}
   setSelected(hit);const t=selectedTransform(hit);
   gesture.current={mode:'drag',selected:hit,pointerIds:[e.pointerId],startCenter:p,startDistance:0,startAngle:0,start:{...t},dragOffset:{x:p.x-t.x*c.width,y:p.y-t.y*c.height}};
  }else if(active.length>=2){
   const [a,b]=active.slice(0,2),sel=gesture.current?.selected??selected,p1=a[1],p2=b[1],m=center(p1,p2),t=selectedTransform(sel);
   gesture.current={mode:'pinch',selected:sel,pointerIds:[a[0],b[0]],startCenter:m,startDistance:Math.max(1,distance(p1,p2)),startAngle:angle(p1,p2),start:{...t},dragOffset:{x:0,y:0}};
  }
 }
 function move(e:PE<HTMLCanvasElement>){
  if(!pointers.current.has(e.pointerId))return;e.preventDefault();const c=e.currentTarget,p=point(e);pointers.current.set(e.pointerId,p);
  const g=gesture.current;if(!g)return;const active=g.pointerIds.map(id=>pointers.current.get(id)).filter(Boolean) as {x:number;y:number}[];
  if(g.mode==='pinch'&&active.length>=2){
   const p1=active[0],p2=active[1],m=center(p1,p2),ratio=distance(p1,p2)/Math.max(1,g.startDistance),delta=(angle(p1,p2)-g.startAngle)*180/Math.PI;
   applyTransform(g.selected,{x:clamp((g.start.x*c.width+(m.x-g.startCenter.x))/c.width,0,1),y:clamp((g.start.y*c.height+(m.y-g.startCenter.y))/c.height,0,1),size:clamp(g.start.size*ratio,.03,1.5),rotation:Math.round(g.start.rotation+delta)});
  }else if(g.mode==='drag'&&active.length){
   const q=active[0];applyTransform(g.selected,{x:clamp((q.x-g.dragOffset.x)/c.width,0,1),y:clamp((q.y-g.dragOffset.y)/c.height,0,1)});
  }
 }
 function endPointer(e:PE<HTMLCanvasElement>){
  e.preventDefault();pointers.current.delete(e.pointerId);try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}
  const g=gesture.current;if(!g)return;const remaining=[...pointers.current.entries()];
  if(!remaining.length){gesture.current=null;return}
  const [id,p]=remaining[0],t=selectedTransform(g.selected);
  gesture.current={mode:'drag',selected:g.selected,pointerIds:[id],startCenter:p,startDistance:0,startAngle:0,start:{...t},dragOffset:{x:p.x-t.x*e.currentTarget.width,y:p.y-t.y*e.currentTarget.height}};
 }
 function quick(i:number){
  const c=canvasRef.current,ctx=c?.getContext('2d',{alpha:true});if(!c||!ctx||!photo)return;
  let d:{w:number;h:number};
  if(selected.kind==='text')d=textDims(c.width,ctx);else{const layer=logos.find(l=>l.id===selected.id);if(!layer)return;d=logoDims(layer,c.width)}
  const t=activeTransform,a=t.rotation*Math.PI/180,mx=Math.min(.5,(Math.abs(d.w*Math.cos(a))+Math.abs(d.h*Math.sin(a)))/2/c.width+.02),my=Math.min(.5,(Math.abs(d.w*Math.sin(a))+Math.abs(d.h*Math.cos(a)))/2/c.height+.02);
  patchTransform({x:[mx,.5,1-mx][i%3],y:[my,.5,1-my][Math.floor(i/3)]});
 }

 async function exportImage(){
  if(!photo||busy||fontBusy||(text.trim()&&!family))return;setBusy(true);
  try{
   const c=document.createElement('canvas');c.width=photo.width;c.height=photo.height;
   const ctx=c.getContext('2d',{alpha:true});if(!ctx)throw new Error();
   render(ctx,c.width,c.height,true);
   const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,`image/${format}`,quality));if(!blob)throw new Error();
   const ext=blob.type.includes('jpeg')?'jpg':blob.type.split('/')[1]||format;
   downloadBlob(blob,`${photo.name.replace(/\.[^.]+$/,'')}-FGDLL.${ext}`);
   setStatus(format==='png'?'PNG descargado conservando transparencia.':'Imagen descargada.');
  }catch{setStatus('No se pudo descargar. Prueba una imagen más pequeña o cambia el formato.')}finally{setBusy(false)}
 }

 return <main className="brand-app brand-image-artifact">
  <header className="brand-header"><Link href="/herramientas">← Herramientas FGDLL</Link>{admin&&<Link href="/administracion/marca">Administrar recursos</Link>}</header>
  <div className="brand-container">
   <p className="brand-eyebrow">FGDLL · HERRAMIENTAS INSTITUCIONALES</p>
   <h1>Tu imagen, con identidad.</h1>
   <p className="brand-lead">Añade varios logotipos, texto y recursos propios. Los PNG transparentes conservan su canal alfa. Tus recursos subidos se mantienen disponibles durante esta sesión.</p>
   <div className="brand-editor-layout brand-desktop-editor">
    <section className="brand-card brand-workspace brand-image-workspace">
     <label className="brand-upload brand-upload-compact">{photo?'Cambiar imagen':'Subir imagen'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void uploadBase(e.target.files?.[0]);e.target.value=''}}/></label>
     <div className="brand-canvas-wrap brand-checkerboard" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void uploadBase(e.dataTransfer.files[0])}}>
      {!photo?<div className="brand-empty"><strong>Tu imagen aparecerá aquí</strong><span>PNG, JPG o WebP. Si tiene transparencia, la podrás comprobar en la cuadrícula.</span></div>:<canvas ref={canvasRef} aria-label="Editor de imagen FGDLL" onPointerDown={down} onPointerMove={move} onPointerUp={endPointer} onPointerCancel={endPointer}/>}
     </div>
     {photo&&<p className="brand-hint">{photo.width} × {photo.height} px · El lienzo usa canal alfa y conserva transparencia en PNG/WebP.</p>}
     <p className="brand-status" role="status">{status}</p>
    </section>

    <details className="brand-mobile-panel" open>
     <summary>Controles de edición</summary>
     <aside className="brand-controls brand-sidebar">
      <section className="brand-card">
       <h2>1 · Recursos institucionales</h2>
       {catalogLoading&&<p className="brand-hint">Cargando galería…</p>}
       {catalogError&&<p className="brand-error">{catalogError} <button onClick={()=>void refresh()}>Reintentar</button></p>}
       <div className="brand-logo-gallery">{resources.filter(r=>r.kind==='logo').map(r=><button key={r.id} onClick={()=>void addLogo(r.url,r.name,r.id)}><img src={r.url} alt=""/><span>{r.name}</span></button>)}</div>
      </section>

      <section className="brand-card">
       <h2>Recursos subidos</h2>
       <p className="brand-hint">Puedes subir varios PNG/WebP. Se guardan sólo durante esta sesión y aparecen también en la herramienta de video.</p>
       <label className="brand-upload secondary">Subir varios logotipos<input type="file" multiple accept="image/png,image/webp" onChange={e=>{void addUploadedResources(e.target.files);e.target.value=''}}/></label>
       {sessionLogos.length?<div className="brand-uploaded-grid">{sessionLogos.map(r=><div className="brand-uploaded-resource" key={r.id}><button onClick={()=>void addLogo(r.dataUrl,r.name,r.id)}><img src={r.dataUrl} alt=""/><span>{r.name}</span></button><button className="brand-icon-danger" aria-label={`Eliminar ${r.name} de recursos subidos`} onClick={()=>setSessionLogos(removeSessionLogo(r.id))}>×</button></div>)}</div>:<p className="brand-hint">Todavía no has subido recursos en esta sesión.</p>}
      </section>

      <section className="brand-card">
       <h2>Logotipos en el lienzo</h2>
       {logos.length?<div className="brand-layer-list">{logos.map((layer,index)=><div className={`brand-layer-row ${selected.kind==='logo'&&selected.id===layer.id?'selected':''}`} key={layer.id}><button onClick={()=>setSelected({kind:'logo',id:layer.id})}><span>Logo {index+1}</span><small>{layer.name}</small></button><button aria-label={layer.visible?'Ocultar':'Mostrar'} onClick={()=>patchLogo(layer.id,{visible:!layer.visible})}>{layer.visible?'◉':'○'}</button><button aria-label="Eliminar logo" onClick={()=>removeLayer(layer.id)}>×</button></div>)}</div>:<p className="brand-hint">Añade uno o varios logos desde las galerías.</p>}
      </section>

      <section className="brand-card">
       <h2>2 · Texto</h2>
       <label>Texto<textarea rows={3} maxLength={240} value={text} placeholder="Nombre de tu grupo o frase" onChange={e=>{setText(e.target.value.split('\n').slice(0,6).join('\n'));setSelected({kind:'text'})}}/></label>
       <label>Tipografía<select value={fontId} onChange={e=>setFontId(e.target.value)}><option value="" disabled>Selecciona una tipografía</option>{resources.filter(r=>r.kind==='font').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
       {fontBusy&&<p className="brand-hint">Cargando tipografía…</p>}{fontError&&<p className="brand-error">{fontError}</p>}
       <label>Color<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
      </section>

      <section className="brand-card">
       <h2>3 · Ajustar elemento</h2>
       <div className="brand-actions"><button className={selected.kind==='text'?'selected':''} onClick={()=>setSelected({kind:'text'})}>Texto</button>{selectedLogo&&<button className="selected">Logo seleccionado</button>}</div>
       <p className="brand-hint">{selected.kind==='logo'?`Ajustando: ${selectedLogo?.name??'logo'}`:'Ajustando: texto'}</p>
       <div className="brand-positions">{positions.map((label,i)=><button key={label} aria-label={label} title={label} disabled={!photo} onClick={()=>quick(i)}><span style={{justifySelf:['start','center','end'][i%3],alignSelf:['start','center','end'][Math.floor(i/3)]}}>•</span></button>)}</div>
       <label>Tamaño: {Math.round(activeTransform.size*100)}%<input type="range" min=".03" max="1.5" step=".01" value={activeTransform.size} onChange={e=>patchTransform({size:Number(e.target.value)})}/></label>
       <label>Opacidad: {Math.round(activeTransform.opacity*100)}%<input type="range" min=".05" max="1" step=".01" value={activeTransform.opacity} onChange={e=>patchTransform({opacity:Number(e.target.value)})}/></label>
       <label>Rotación: {activeTransform.rotation}°<input type="range" min="-180" max="180" step="1" value={activeTransform.rotation} onChange={e=>patchTransform({rotation:Number(e.target.value)})}/></label>
       <button onClick={()=>selected.kind==='text'?setTextTransform(initialText):patchTransform(initialLogo())}>Restablecer elemento</button>
      </section>

      <section className="brand-card brand-export">
       <h2>4 · Descargar</h2>
       <label>Formato<select value={format} onChange={e=>setFormat(e.target.value as 'png'|'jpeg'|'webp')}><option value="png">PNG — conserva transparencia</option><option value="webp">WebP — conserva transparencia</option><option value="jpeg">JPG — fondo blanco</option></select></label>
       {format!=='png'&&<label>Calidad: {Math.round(quality*100)}%<input type="range" min=".55" max="1" step=".01" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}
       <button className="brand-primary" disabled={!photo||busy||fontBusy||(!!text.trim()&&!family)} onClick={()=>void exportImage()}>{busy?'Preparando…':'Descargar imagen'}</button>
       <p className="brand-hint">PNG y WebP respetan las zonas transparentes. JPG siempre se exporta con fondo blanco.</p>
      </section>
     </aside>
    </details>
   </div>
  </div>
 </main>;
}
