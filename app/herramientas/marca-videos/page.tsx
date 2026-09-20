'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type PointerEvent as PE} from 'react';
import {brandJson,loadBrandFont,type BrandResource} from '../../lib/brand-client';
import {addSessionLogoFiles,readSessionLogos,removeSessionLogo,type SessionLogoResource} from '../../lib/session-logo-resources';
import '../marca-imagenes/editor.css';

type Picture={el:HTMLImageElement;name:string;width:number;height:number};
type Transform={x:number;y:number;size:number;opacity:number;rotation:number};
type Timing={all:boolean;start:number;end:number};
type LogoLayer={id:string;name:string;sourceId:string;picture:Picture;transform:Transform;visible:boolean;timing:Timing};
type Selected={kind:'logo';id:string}|{kind:'text'};
type VideoInfo={name:string;width:number;height:number;duration:number};
type Gesture={mode:'drag'|'pinch';selected:Selected;pointerIds:number[];startCenter:{x:number;y:number};startDistance:number;startAngle:number;start:Transform;dragOffset:{x:number;y:number}};

const MAX_DIMENSION=1280;
const initialLogo=(index=0):Transform=>({x:.78-(index%3)*.08,y:.78-Math.floor(index/3)*.08,size:.2,opacity:1,rotation:0});
const initialText:Transform={x:.5,y:.88,size:.65,opacity:1,rotation:0};
const positions=['Superior izquierda','Superior centro','Superior derecha','Centro izquierda','Centro','Centro derecha','Inferior izquierda','Inferior centro','Inferior derecha'];

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function makeId(){return `logo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function loadPicture(src:string,name:string):Promise<Picture>{
 return new Promise((resolve,reject)=>{
  const el=new Image();
  el.onload=()=>el.naturalWidth&&el.naturalHeight?resolve({el,name,width:el.naturalWidth,height:el.naturalHeight}):reject(new Error('Imagen sin dimensiones válidas.'));
  el.onerror=()=>reject(new Error('No se pudo abrir el logotipo.'));
  el.src=src;
 });
}
function downloadBlob(blob:Blob,name:string){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function captureMedia(el:HTMLVideoElement):MediaStream|null{
 const node=el as HTMLVideoElement&{captureStream?:()=>MediaStream;mozCaptureStream?:()=>MediaStream};
 if(typeof node.captureStream==='function')return node.captureStream();
 if(typeof node.mozCaptureStream==='function')return node.mozCaptureStream();
 return null;
}
function mimeCandidates(format:'mp4'|'webm'){
 return format==='mp4'
  ?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=h264,aac','video/mp4']
  :['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
}
function pickMime(format:'mp4'|'webm'){
 if(typeof MediaRecorder==='undefined')return'';
 return mimeCandidates(format).find(m=>MediaRecorder.isTypeSupported(m))||'';
}

export default function VideoEditor(){
 const [resources,setResources]=useState<BrandResource[]>([]),[sessionLogos,setSessionLogos]=useState<SessionLogoResource[]>([]);
 const [catalogLoading,setCatalogLoading]=useState(true),[catalogError,setCatalogError]=useState(''),[admin,setAdmin]=useState(false);
 const [videoInfo,setVideoInfo]=useState<VideoInfo|null>(null),[scrub,setScrub]=useState(0),[logos,setLogos]=useState<LogoLayer[]>([]);
 const [selected,setSelected]=useState<Selected>({kind:'text'});
 const [text,setText]=useState(''),[textTransform,setTextTransform]=useState(initialText),[textTiming,setTextTiming]=useState<Timing>({all:true,start:0,end:0}),[color,setColor]=useState('#ffffff');
 const [fontId,setFontId]=useState(''),[family,setFamily]=useState(''),[fontBusy,setFontBusy]=useState(false),[fontError,setFontError]=useState('');
 const [outputFormat,setOutputFormat]=useState<'mp4'|'webm'>('mp4'),[mp4Supported,setMp4Supported]=useState(false),[webmSupported,setWebmSupported]=useState(false);
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState<number|null>(null),[status,setStatus]=useState('Sube un video para comenzar.'),[recordError,setRecordError]=useState('');
 const [resultUrl,setResultUrl]=useState(''),[resultName,setResultName]=useState(''),[resultNote,setResultNote]=useState('');
 const videoRef=useRef<HTMLVideoElement>(null),canvasRef=useRef<HTMLCanvasElement>(null),videoUrlRef=useRef(''),resultUrlRef=useRef(''),resultBlobRef=useRef<Blob|null>(null);
 const pointers=useRef(new Map<number,{x:number;y:number}>()),gesture=useRef<Gesture|null>(null);

 useEffect(()=>{
  document.title='Marca de videos | FGDLL';setSessionLogos(readSessionLogos());void refresh();
  fetch('/api/portal/me',{cache:'no-store'}).then(brandJson).then(d=>setAdmin(d.profile?.role==='admin')).catch(()=>{});
  const mp4=!!pickMime('mp4'),webm=!!pickMime('webm');setMp4Supported(mp4);setWebmSupported(webm);
  if(!mp4&&webm)setOutputFormat('webm');
  if(typeof MediaRecorder==='undefined'||(!mp4&&!webm))setRecordError('Este navegador no permite generar video con MediaRecorder.');
  return()=>{if(videoUrlRef.current)URL.revokeObjectURL(videoUrlRef.current);if(resultUrlRef.current)URL.revokeObjectURL(resultUrlRef.current)};
 },[]);

 async function refresh(){
  setCatalogLoading(true);setCatalogError('');
  try{
   const d=await fetch('/api/brand',{cache:'no-store'}).then(brandJson);setResources(d.resources);
   const font=d.resources.find((r:BrandResource)=>r.id==='brand-ringbearer')??d.resources.find((r:BrandResource)=>r.kind==='font');if(font&&!fontId)setFontId(font.id);
  }catch(e){setCatalogError((e as Error).message)}finally{setCatalogLoading(false)}
 }
 const selectedFont=resources.find(r=>r.id===fontId&&r.kind==='font');
 useEffect(()=>{
  let alive=true;setFamily('');setFontError('');
  if(!selectedFont){setFontBusy(false);return}
  setFontBusy(true);loadBrandFont(selectedFont).then(f=>{if(alive)setFamily(f)}).catch(()=>{if(alive)setFontError('No se pudo cargar esta tipografía. Selecciona otra.')}).finally(()=>{if(alive)setFontBusy(false)});
  return()=>{alive=false};
 },[selectedFont]);

 const duration=videoInfo&&Number.isFinite(videoInfo.duration)?Math.max(0,videoInfo.duration):0;
 const selectedLogo=useMemo(()=>selected.kind==='logo'?logos.find(l=>l.id===selected.id)??null:null,[selected,logos]);
 const activeTransform=selected.kind==='logo'?(selectedLogo?.transform??initialLogo()):textTransform;
 const activeTiming=selected.kind==='logo'?(selectedLogo?.timing??{all:true,start:0,end:duration}):textTiming;
 const selectedLabel=selected.kind==='logo'?(selectedLogo?.name??'Logotipo'):'Texto';

 function uploadVideo(file:File|undefined){
  if(!file)return;if(!file.type.startsWith('video/')){setStatus('Selecciona un archivo de video.');return}
  const v=videoRef.current;if(!v)return;const url=URL.createObjectURL(file),previous=videoUrlRef.current;
  v.onloadedmetadata=()=>{
   if(previous)URL.revokeObjectURL(previous);videoUrlRef.current=url;
   const info={name:file.name,width:v.videoWidth,height:v.videoHeight,duration:v.duration};setVideoInfo(info);setScrub(0);
   const full=Number.isFinite(v.duration)&&v.duration>0?v.duration:0;setTextTiming({all:true,start:0,end:full});
   setLogos(all=>all.map(l=>({...l,timing:{all:true,start:0,end:full}})));
   const scale=Math.min(1,MAX_DIMENSION/Math.max(v.videoWidth,v.videoHeight)),c=canvasRef.current;
   if(c){c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale)}
   setStatus(`${v.videoWidth} × ${v.videoHeight} px · ${Math.round(v.duration)} s. Video listo.`);redraw();
  };
  v.onerror=()=>{URL.revokeObjectURL(url);setStatus('No se pudo abrir el video.')};v.src=url;v.load();
 }

 async function addLogo(src:string,name:string,sourceId:string){
  try{
   const picture=await loadPicture(src,name),full=duration;
   const layer:LogoLayer={id:makeId(),name,sourceId,picture,transform:initialLogo(logos.length),visible:true,timing:{all:true,start:0,end:full}};
   setLogos(all=>[...all,layer]);setSelected({kind:'logo',id:layer.id});setStatus(`${name} añadido como capa independiente.`);
  }catch(e){setStatus((e as Error).message)}
 }
 async function addUploadedResources(files:FileList|null){
  if(!files?.length)return;const result=await addSessionLogoFiles(files);setSessionLogos(result.items);
  setStatus(result.warnings.length?result.warnings.join(' '):`${files.length} recurso(s) guardado(s) durante esta sesión.`);
 }
 function removeLayer(id:string){setLogos(all=>all.filter(l=>l.id!==id));if(selected.kind==='logo'&&selected.id===id)setSelected({kind:'text'})}
 function patchLogo(id:string,patch:Partial<LogoLayer>){setLogos(all=>all.map(l=>l.id===id?{...l,...patch}:l))}
 function patchTransform(patch:Partial<Transform>){
  if(selected.kind==='text'){setTextTransform(t=>({...t,...patch}));return}
  setLogos(all=>all.map(l=>l.id===selected.id?{...l,transform:{...l.transform,...patch}}:l));
 }
 function patchTiming(patch:Partial<Timing>){
  const max=duration;
  const normalize=(base:Timing)=>{
   const next={...base,...patch};next.start=clamp(Number(next.start)||0,0,max);next.end=clamp(Number(next.end)||0,0,max);
   if(next.start>next.end){if(Object.prototype.hasOwnProperty.call(patch,'start'))next.end=next.start;else next.start=next.end}
   return next;
  };
  if(selected.kind==='text'){setTextTiming(t=>normalize(t));return}
  setLogos(all=>all.map(l=>l.id===selected.id?{...l,timing:normalize(l.timing)}:l));
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
 function visible(timing:Timing,time:number){return timing.all||(time>=timing.start&&time<=timing.end)}
 function drawLogo(ctx:CanvasRenderingContext2D,layer:LogoLayer,w:number,h:number,time:number){
  if(!layer.visible||!visible(layer.timing,time))return;const d=logoDims(layer,w),t=layer.transform;
  ctx.save();ctx.translate(t.x*w,t.y*h);ctx.rotate(t.rotation*Math.PI/180);ctx.globalAlpha=t.opacity;ctx.drawImage(layer.picture.el,-d.w/2,-d.h/2,d.w,d.h);ctx.restore();
 }
 function drawText(ctx:CanvasRenderingContext2D,w:number,h:number,time:number){
  if(!text.trim()||!family||fontBusy||!visible(textTiming,time))return;
  const d=textDims(w,ctx),t=textTransform,l=textLayout(ctx);ctx.save();ctx.translate(t.x*w,t.y*h);ctx.rotate(t.rotation*Math.PI/180);ctx.globalAlpha=t.opacity;
  ctx.translate(-d.w/2,-d.h/2);ctx.scale(d.w/l.width,d.w/l.width);ctx.font=`200px "${family}"`;ctx.fillStyle=color;ctx.textBaseline='alphabetic';
  l.lines.forEach((line,i)=>{const m=l.metrics[i],left=Math.max(0,m.actualBoundingBoxLeft||0);ctx.fillText(line,20+left+(l.width-40-m.width-left)/2,20+l.ascent+i*l.lineHeight)});ctx.restore();
 }
 function drawFrame(){
  const c=canvasRef.current,v=videoRef.current;if(!c||!v||!videoInfo)return;const ctx=c.getContext('2d',{alpha:true});if(!ctx)return;
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(v,0,0,c.width,c.height);
  const time=v.currentTime||0;logos.forEach(layer=>drawLogo(ctx,layer,c.width,c.height,time));drawText(ctx,c.width,c.height,time);ctx.restore();
 }
 function redraw(){requestAnimationFrame(drawFrame)}
 useEffect(()=>{redraw()},[videoInfo,logos,text,textTransform,textTiming,color,family,fontBusy]);

 function point(e:PE<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}}
 function center(a:{x:number;y:number},b:{x:number;y:number}){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(b.x-a.x,b.y-a.y)}
 function angle(a:{x:number;y:number},b:{x:number;y:number}){return Math.atan2(b.y-a.y,b.x-a.x)}
 function selectedTransform(sel:Selected){if(sel.kind==='text')return textTransform;return logos.find(l=>l.id===sel.id)?.transform??initialLogo()}
 function hitTest(c:HTMLCanvasElement,p:{x:number;y:number}):Selected|null{
  const ctx=c.getContext('2d',{alpha:true});if(!ctx)return null;const r=c.getBoundingClientRect(),pad=Math.max(18,28*c.width/Math.max(1,r.width));
  if(text.trim()&&family){
   const d=textDims(c.width,ctx),t=textTransform,a=-t.rotation*Math.PI/180,dx=p.x-t.x*c.width,dy=p.y-t.y*c.height,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
   if(Math.abs(x)<=d.w/2+pad&&Math.abs(y)<=d.h/2+pad)return{kind:'text'};
  }
  for(const layer of [...logos].reverse()){
   if(!layer.visible)continue;const d=logoDims(layer,c.width),t=layer.transform,a=-t.rotation*Math.PI/180,dx=p.x-t.x*c.width,dy=p.y-t.y*c.height,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
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
   const hit=hitTest(c,p);if(!hit){gesture.current=null;return}setSelected(hit);const t=selectedTransform(hit);
   gesture.current={mode:'drag',selected:hit,pointerIds:[e.pointerId],startCenter:p,startDistance:0,startAngle:0,start:{...t},dragOffset:{x:p.x-t.x*c.width,y:p.y-t.y*c.height}};
  }else if(active.length>=2){
   const [a,b]=active.slice(0,2),sel=gesture.current?.selected??selected,p1=a[1],p2=b[1],m=center(p1,p2),t=selectedTransform(sel);
   gesture.current={mode:'pinch',selected:sel,pointerIds:[a[0],b[0]],startCenter:m,startDistance:Math.max(1,distance(p1,p2)),startAngle:angle(p1,p2),start:{...t},dragOffset:{x:0,y:0}};
  }
 }
 function move(e:PE<HTMLCanvasElement>){
  if(!pointers.current.has(e.pointerId))return;e.preventDefault();const c=e.currentTarget,p=point(e);pointers.current.set(e.pointerId,p),g=gesture.current;if(!g)return;
  const active=g.pointerIds.map(id=>pointers.current.get(id)).filter(Boolean) as {x:number;y:number}[];
  if(g.mode==='pinch'&&active.length>=2){
   const p1=active[0],p2=active[1],m=center(p1,p2),ratio=distance(p1,p2)/Math.max(1,g.startDistance),delta=(angle(p1,p2)-g.startAngle)*180/Math.PI;
   applyTransform(g.selected,{x:clamp((g.start.x*c.width+(m.x-g.startCenter.x))/c.width,0,1),y:clamp((g.start.y*c.height+(m.y-g.startCenter.y))/c.height,0,1),size:clamp(g.start.size*ratio,.03,1.5),rotation:Math.round(g.start.rotation+delta)});
  }else if(g.mode==='drag'&&active.length){const q=active[0];applyTransform(g.selected,{x:clamp((q.x-g.dragOffset.x)/c.width,0,1),y:clamp((q.y-g.dragOffset.y)/c.height,0,1)})}
 }
 function endPointer(e:PE<HTMLCanvasElement>){
  e.preventDefault();pointers.current.delete(e.pointerId);try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}
  const g=gesture.current;if(!g)return;const rest=[...pointers.current.entries()];if(!rest.length){gesture.current=null;return}
  const [id,p]=rest[0],t=selectedTransform(g.selected);gesture.current={mode:'drag',selected:g.selected,pointerIds:[id],startCenter:p,startDistance:0,startAngle:0,start:{...t},dragOffset:{x:p.x-t.x*e.currentTarget.width,y:p.y-t.y*e.currentTarget.height}};
 }
 function quick(i:number){
  const c=canvasRef.current,ctx=c?.getContext('2d',{alpha:true});if(!c||!ctx||!videoInfo)return;
  let d:{w:number;h:number};if(selected.kind==='text')d=textDims(c.width,ctx);else{const layer=logos.find(l=>l.id===selected.id);if(!layer)return;d=logoDims(layer,c.width)}
  const t=activeTransform,a=t.rotation*Math.PI/180,mx=Math.min(.5,(Math.abs(d.w*Math.cos(a))+Math.abs(d.h*Math.sin(a)))/2/c.width+.02),my=Math.min(.5,(Math.abs(d.w*Math.sin(a))+Math.abs(d.h*Math.cos(a)))/2/c.height+.02);
  patchTransform({x:[mx,.5,1-mx][i%3],y:[my,.5,1-my][Math.floor(i/3)]});
 }
 function scrubTo(time:number){const v=videoRef.current;if(!v||!videoInfo)return;setScrub(time);v.currentTime=time}

 async function saveResult(){
  const blob=resultBlobRef.current;if(!blob||!resultName)return;const file=new File([blob],resultName,{type:blob.type||'video/mp4'});
  const nav=navigator as Navigator&{canShare?:(data:{files?:File[]})=>boolean;share?:(data:{files?:File[];title?:string})=>Promise<void>};
  try{if(nav.share&&(!nav.canShare||nav.canShare({files:[file]}))){await nav.share({files:[file],title:'Video FGDLL'});return}}catch{}
  downloadBlob(blob,resultName);
 }
 function downloadResult(){const blob=resultBlobRef.current;if(blob&&resultName)downloadBlob(blob,resultName)}
 function openResult(){if(resultUrlRef.current)window.open(resultUrlRef.current,'_blank','noopener,noreferrer')}

 async function exportVideo(){
  const c=canvasRef.current,v=videoRef.current;if(!c||!v||!videoInfo||busy||fontBusy||(text.trim()&&!family))return;
  const mime=pickMime(outputFormat);
  if(!mime){setStatus(outputFormat==='mp4'?'MP4 no está disponible en este navegador. Elige WebM o usa Safari/Chrome actualizado.':'WebM no está disponible en este navegador.');return}
  const canvasStream=(c as HTMLCanvasElement&{captureStream?:(fps?:number)=>MediaStream}).captureStream?.(30);
  if(!canvasStream){setStatus('Este navegador no permite capturar el lienzo de video.');return}
  const sourceStream=captureMedia(v),audioTracks=sourceStream?.getAudioTracks()??[],mixed=new MediaStream([...canvasStream.getVideoTracks(),...audioTracks]);
  let recorder:MediaRecorder;try{recorder=new MediaRecorder(mixed,{mimeType:mime,videoBitsPerSecond:6_000_000})}catch{setStatus('No se pudo iniciar la exportación.');return}
  const chunks:BlobPart[]=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  setBusy(true);setProgress(0);setResultNote('');setStatus(audioTracks.length?`Generando ${outputFormat.toUpperCase()} con audio…`:`Generando ${outputFormat.toUpperCase()} sin audio…`);
  const wasMuted=v.muted;v.muted=true;v.currentTime=0;await new Promise(res=>setTimeout(res,120));
  let raf=0;const loop=()=>{if(v.paused||v.ended)return;drawFrame();setProgress(Math.min(99,Math.round(v.currentTime/videoInfo.duration*100)));raf=requestAnimationFrame(loop)};
  recorder.start(250);
  try{await v.play()}catch{setBusy(false);setProgress(null);setStatus('El navegador bloqueó la reproducción necesaria para exportar. Toca nuevamente “Generar video”.');return}
  raf=requestAnimationFrame(loop);await new Promise<void>(res=>{v.onended=()=>res()});cancelAnimationFrame(raf);await new Promise(res=>setTimeout(res,180));
  const blob=await new Promise<Blob>(resolve=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:mime.split(';')[0]}));recorder.stop()});
  const ext=outputFormat==='mp4'?'mp4':'webm',name=`${videoInfo.name.replace(/\.[^.]+$/,'')}-FGDLL.${ext}`;
  if(resultUrlRef.current)URL.revokeObjectURL(resultUrlRef.current);const url=URL.createObjectURL(blob);resultUrlRef.current=url;resultBlobRef.current=blob;
  setResultUrl(url);setResultName(name);setResultNote(audioTracks.length?`${ext.toUpperCase()} generado con audio.`:`${ext.toUpperCase()} generado sin audio porque el navegador no permitió capturar la pista original.`);
  v.muted=wasMuted;v.currentTime=0;setProgress(null);setBusy(false);setStatus('Video listo para descargar o compartir.');redraw();
 }

 return <main className="brand-app brand-video-artifact">
  <div className="brand-container brand-video-container">
   <nav className="brand-video-nav"><Link href="/herramientas">← Herramientas FGDLL</Link>{admin&&<Link href="/administracion/marca">Administrar recursos</Link>}<Link href="/">Inicio</Link></nav>
   <p className="brand-eyebrow">FGDLL · HERRAMIENTAS INSTITUCIONALES</p>
   <h1>Tu video, con identidad.</h1>
   <p className="brand-lead">El video ocupa el área principal de trabajo. Añade varios logotipos PNG transparentes, texto y tiempos independientes; mueve y transforma cada elemento directamente en la pantalla.</p>

   <div className="brand-editor-layout brand-video-editor-layout">
    <section className="brand-card brand-workspace brand-video-workspace">
     <div className="brand-workspace-toolbar"><label className="brand-upload brand-upload-compact">{videoInfo?'Cambiar video':'Subir video'}<input type="file" accept="video/*" onChange={e=>{uploadVideo(e.target.files?.[0]);e.target.value=''}}/></label>{videoInfo&&<span>{videoInfo.width} × {videoInfo.height} · {Math.round(videoInfo.duration)} s</span>}</div>
     <div className="brand-canvas-wrap brand-checkerboard brand-video-canvas" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();uploadVideo(e.dataTransfer.files[0])}}>
      {!videoInfo?<div className="brand-empty"><strong>Tu video aparecerá aquí</strong><span>El área de edición se adapta para que puedas ver el video completo en computadora y móvil.</span></div>:<canvas ref={canvasRef} aria-label="Editor de video FGDLL" onPointerDown={down} onPointerMove={move} onPointerUp={endPointer} onPointerCancel={endPointer}/>}
      <video ref={videoRef} playsInline onSeeked={redraw} onLoadedData={redraw} style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}}/>
     </div>
     {videoInfo&&<><p className="brand-hint brand-touch-hint"><strong>Edición directa:</strong> un dedo mueve; dos dedos cambian tamaño y rotación. Los PNG mantienen su transparencia.</p><label>Vista previa: {scrub.toFixed(1)} s<input type="range" min="0" max={Math.max(videoInfo.duration-.1,0)} step=".1" value={scrub} onChange={e=>scrubTo(Number(e.target.value))} disabled={busy}/></label></>}
     <p className="brand-status" role="status">{status}</p>{recordError&&<p className="brand-error">{recordError}</p>}
    </section>

    <details className="brand-mobile-panel brand-video-panel" open>
     <summary>Controles de edición</summary>
     <aside className="brand-controls brand-sidebar">
      <section className="brand-card">
       <h2>1 · Galería institucional</h2>
       {catalogLoading&&<p className="brand-hint">Cargando logotipos…</p>}{catalogError&&<p className="brand-error">{catalogError}</p>}
       <div className="brand-logo-gallery brand-video-logo-gallery">{resources.filter(r=>r.kind==='logo').map(r=><button key={r.id} onClick={()=>void addLogo(r.url,r.name,r.id)}><img src={r.url} alt=""/><span>{r.name}</span></button>)}</div>
      </section>

      <section className="brand-card">
       <h2>Recursos subidos</h2>
       <p className="brand-hint">Sube varios PNG/WebP transparentes. Se guardan durante esta sesión y también estarán disponibles en Marca de Imágenes.</p>
       <label className="brand-upload secondary">Subir varios logotipos<input type="file" multiple accept="image/png,image/webp" onChange={e=>{void addUploadedResources(e.target.files);e.target.value=''}}/></label>
       {sessionLogos.length?<div className="brand-uploaded-grid">{sessionLogos.map(r=><div className="brand-uploaded-resource" key={r.id}><button onClick={()=>void addLogo(r.dataUrl,r.name,r.id)}><img src={r.dataUrl} alt=""/><span>{r.name}</span></button><button className="brand-icon-danger" aria-label={`Eliminar ${r.name}`} onClick={()=>setSessionLogos(removeSessionLogo(r.id))}>×</button></div>)}</div>:<p className="brand-hint">No hay recursos subidos en esta sesión.</p>}
      </section>

      <section className="brand-card">
       <h2>Logotipos en el video</h2>
       {logos.length?<div className="brand-layer-list">{logos.map((layer,index)=><div className={`brand-layer-row ${selected.kind==='logo'&&selected.id===layer.id?'selected':''}`} key={layer.id}><button onClick={()=>setSelected({kind:'logo',id:layer.id})}><span>Logo {index+1}</span><small>{layer.name}</small></button><button aria-label={layer.visible?'Ocultar':'Mostrar'} onClick={()=>patchLogo(layer.id,{visible:!layer.visible})}>{layer.visible?'◉':'○'}</button><button aria-label="Eliminar logo" onClick={()=>removeLayer(layer.id)}>×</button></div>)}</div>:<p className="brand-hint">Puedes añadir tantos logos como necesites; cada uno tiene controles y tiempo propios.</p>}
      </section>

      <section className="brand-card">
       <h2>2 · Texto</h2>
       {resources.some(r=>r.kind==='text')&&<div className="brand-actions brand-text-presets">{resources.filter(r=>r.kind==='text').map(r=><button key={r.id} onClick={()=>{setText((r.content??r.name).split('\n').slice(0,6).join('\n'));setSelected({kind:'text'})}}>{r.name}</button>)}</div>}
       <label>Texto<textarea rows={3} maxLength={240} value={text} placeholder="Nombre de tu grupo o frase" onChange={e=>{setText(e.target.value.split('\n').slice(0,6).join('\n'));setSelected({kind:'text'})}}/></label>
       <label>Tipografía<select value={fontId} onChange={e=>setFontId(e.target.value)}><option value="" disabled>Selecciona una tipografía</option>{resources.filter(r=>r.kind==='font').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
       {fontBusy&&<p className="brand-hint">Cargando tipografía…</p>}{fontError&&<p className="brand-error">{fontError}</p>}
       <label>Color<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
      </section>

      <section className="brand-card" id="video-element-settings">
       <h2>3 · Ajustar {selectedLabel}</h2>
       <div className="brand-actions"><button className={selected.kind==='text'?'selected':''} onClick={()=>setSelected({kind:'text'})}>Texto</button>{selectedLogo&&<button className="selected">Logo seleccionado</button>}</div>
       <div className="brand-positions">{positions.map((label,i)=><button key={label} title={label} aria-label={label} disabled={!videoInfo} onClick={()=>quick(i)}><span style={{justifySelf:['start','center','end'][i%3],alignSelf:['start','center','end'][Math.floor(i/3)]}}>•</span></button>)}</div>
       <label>Tamaño: {Math.round(activeTransform.size*100)}%<input type="range" min=".03" max="1.5" step=".01" value={activeTransform.size} onChange={e=>patchTransform({size:Number(e.target.value)})}/></label>
       <label>Opacidad: {Math.round(activeTransform.opacity*100)}%<input type="range" min=".05" max="1" step=".01" value={activeTransform.opacity} onChange={e=>patchTransform({opacity:Number(e.target.value)})}/></label>
       <label>Rotación: {activeTransform.rotation}°<input type="range" min="-180" max="180" step="1" value={activeTransform.rotation} onChange={e=>patchTransform({rotation:Number(e.target.value)})}/></label>
       <div className="brand-timing"><div className="brand-timing-head"><strong>Tiempo de {selectedLabel}</strong>{videoInfo&&<span>{activeTiming.all?'Todo el video':`${activeTiming.start.toFixed(1)} s — ${activeTiming.end.toFixed(1)} s`}</span>}</div>
        <label className="brand-check"><input type="checkbox" checked={activeTiming.all} onChange={e=>patchTiming({all:e.target.checked})}/>Mostrar durante todo el video</label>
        {videoInfo&&!activeTiming.all&&<div className="brand-time-controls"><label>Empieza en <strong>{activeTiming.start.toFixed(1)} s</strong><input type="range" min="0" max={duration} step=".1" value={activeTiming.start} onChange={e=>patchTiming({start:Number(e.target.value)})}/><input type="number" min="0" max={duration} step=".1" value={activeTiming.start} onChange={e=>patchTiming({start:Number(e.target.value)})}/></label><label>Termina en <strong>{activeTiming.end.toFixed(1)} s</strong><input type="range" min="0" max={duration} step=".1" value={activeTiming.end} onChange={e=>patchTiming({end:Number(e.target.value)})}/><input type="number" min="0" max={duration} step=".1" value={activeTiming.end} onChange={e=>patchTiming({end:Number(e.target.value)})}/></label></div>}
       </div>
       <button onClick={()=>selected.kind==='text'?setTextTransform(initialText):patchTransform(initialLogo())}>Restablecer elemento</button>
      </section>

      <section className="brand-card brand-export">
       <h2>4 · Generar y descargar</h2>
       <label>Formato<select value={outputFormat} onChange={e=>setOutputFormat(e.target.value as 'mp4'|'webm')}><option value="mp4" disabled={!mp4Supported}>MP4 {mp4Supported?'— disponible':'— no compatible en este navegador'}</option><option value="webm" disabled={!webmSupported}>WebM {webmSupported?'— disponible':'— no compatible'}</option></select></label>
       <button className="brand-primary" disabled={!videoInfo||busy||fontBusy||!!recordError||(!!text.trim()&&!family)||!pickMime(outputFormat)} onClick={()=>void exportVideo()}>{busy?`Generando… ${progress??0}%`:`Generar ${outputFormat.toUpperCase()}`}</button>
       <p className="brand-hint">MP4 se ofrece cuando el navegador puede producir MP4 real. No se cambia la extensión de un WebM para simular MP4.</p>
       {resultUrl&&<div className="brand-video-result"><h3>Video listo</h3><video src={resultUrl} controls playsInline preload="metadata"/><div className="brand-result-actions"><button className="brand-primary" onClick={downloadResult}>Descargar {resultName.endsWith('.mp4')?'MP4':'WebM'}</button><button onClick={()=>void saveResult()}>Guardar / Compartir</button><button onClick={openResult}>Abrir video</button></div>{resultNote&&<p className="brand-hint">{resultNote}</p>}</div>}
      </section>
     </aside>
    </details>
   </div>
  </div>
 </main>;
}
