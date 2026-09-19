'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type PointerEvent as PE} from 'react';
import {brandJson,loadBrandFont,type BrandResource} from '../../lib/brand-client';
import '../marca-imagenes/editor.css';

type Transform={x:number;y:number;size:number;opacity:number;rotation:number};
type Timing={all:boolean;start:number;end:number};
type Target='logo'|'logo2'|'text';
type Picture={el:HTMLImageElement;name:string;width:number;height:number};
type VideoInfo={name:string;width:number;height:number;duration:number};

const initialLogo2:Transform={x:.22,y:.78,size:.2,opacity:1,rotation:0};
const initialLogo:Transform={x:.78,y:.78,size:.2,opacity:1,rotation:0};
const initialText:Transform={x:.5,y:.88,size:.65,opacity:1,rotation:0};
const positions=['Superior izquierda','Superior centro','Superior derecha','Centro izquierda','Centro','Centro derecha','Inferior izquierda','Inferior centro','Inferior derecha'];
const MAX_DIMENSION=1280;

function image(src:string,name:string):Promise<Picture>{return new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>{if(!el.naturalWidth||!el.naturalHeight)reject(new Error('Imagen sin dimensiones válidas.'));else resolve({el,name,width:el.naturalWidth,height:el.naturalHeight})};el.onerror=()=>reject(new Error('No se pudo abrir el logotipo.'));el.src=src})}
function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function captureMedia(el:HTMLVideoElement):MediaStream|null{const anyEl=el as unknown as {captureStream?:()=>MediaStream;mozCaptureStream?:()=>MediaStream};if(typeof anyEl.captureStream==='function')return anyEl.captureStream();if(typeof anyEl.mozCaptureStream==='function')return anyEl.mozCaptureStream();return null}
function pickMime(){const candidates=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=h264,aac','video/mp4'];return candidates.find(m=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported(m))||''}

export default function VideoEditor(){
 const [resources,setResources]=useState<BrandResource[]>([]),[catalogLoading,setCatalogLoading]=useState(true),[catalogError,setCatalogError]=useState(''),[admin,setAdmin]=useState(false);
 const [videoInfo,setVideoInfo]=useState<VideoInfo|null>(null),[scrub,setScrub]=useState(0);
 const [logo,setLogo]=useState<Picture|null>(null),[logoId,setLogoId]=useState(''),[showLogo,setShowLogo]=useState(true);
 const [logo2,setLogo2]=useState<Picture|null>(null),[logo2Id,setLogo2Id]=useState(''),[showLogo2,setShowLogo2]=useState(true),[secondEnabled,setSecondEnabled]=useState(false);
 const [text,setText]=useState(''),[color,setColor]=useState('#ffffff'),[fontId,setFontId]=useState(''),[family,setFamily]=useState(''),[fontBusy,setFontBusy]=useState(false),[fontError,setFontError]=useState('');
 const [target,setTarget]=useState<Target>('logo'),[transforms,setTransforms]=useState({logo:initialLogo,logo2:initialLogo2,text:initialText});
 const [timings,setTimings]=useState<Record<Target,Timing>>({logo:{all:true,start:0,end:0},logo2:{all:true,start:0,end:0},text:{all:true,start:0,end:0}});
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState<number|null>(null),[status,setStatus]=useState('Sube un video para comenzar.'),[recordError,setRecordError]=useState('');
 const videoRef=useRef<HTMLVideoElement>(null),canvasRef=useRef<HTMLCanvasElement>(null);
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 const gesture=useRef<{
  target:Target;
  mode:'drag'|'pinch';
  pointerIds:number[];
  startCenter:{x:number;y:number};
  startDistance:number;
  startAngle:number;
  start:Transform;
  dragOffset:{x:number;y:number};
 }|null>(null);
 const logoRequest=useRef(0),logo2Request=useRef(0),videoUrlRef=useRef('');

 useEffect(()=>{
  document.title='Logos y texto en videos | FGDLL';
  void refresh();
  fetch('/api/portal/me',{cache:'no-store'}).then(brandJson).then(d=>setAdmin(d.profile?.role==='admin')).catch(()=>{});
  if(typeof MediaRecorder==='undefined'||!pickMime())setRecordError('Tu navegador no permite grabar video aquí. Prueba con Chrome, Edge o Firefox actualizados.');
  return()=>{if(videoUrlRef.current)URL.revokeObjectURL(videoUrlRef.current)};
 },[]);

 const selectedFont=resources.find(r=>r.id===fontId&&r.kind==='font');
 useEffect(()=>{let alive=true;setFamily('');setFontError('');if(!selectedFont){setFontBusy(false);return}setFontBusy(true);loadBrandFont(selectedFont).then(f=>{if(alive)setFamily(f)}).catch(()=>{if(alive)setFontError('No se pudo cargar esta tipografía. Selecciona otra o actualiza la galería.')}).finally(()=>{if(alive)setFontBusy(false)});return()=>{alive=false}},[selectedFont]);

 async function chooseLogo(resource:BrandResource,slot:'logo'|'logo2'='logo'){const counter=slot==='logo2'?logo2Request:logoRequest;const n=++counter.current;try{const loaded=await image(resource.url,resource.name);if(n===counter.current){if(slot==='logo2'){setLogo2(loaded);setLogo2Id(resource.id)}else{setLogo(loaded);setLogoId(resource.id)}}}catch(e){if(n===counter.current)setStatus((e as Error).message)}}

 async function refresh(){
  setCatalogLoading(true);setCatalogError('');
  try{
   const d=await fetch('/api/brand',{cache:'no-store'}).then(brandJson);
   setResources(d.resources);
   const logos=d.resources.filter((r:BrandResource)=>r.kind==='logo');
   const first=logos.find((r:BrandResource)=>r.id==='brand-logo-8')??logos[0];
   if(first)void chooseLogo(first,'logo');
   const second=logos.find((r:BrandResource)=>r.id!==first?.id)??first;
   if(second)void chooseLogo(second,'logo2');
   const font=d.resources.find((r:BrandResource)=>r.id==='brand-ringbearer')??d.resources.find((r:BrandResource)=>r.kind==='font');
   if(font)setFontId(font.id);
  }catch(e){setCatalogError((e as Error).message)}finally{setCatalogLoading(false)}
 }

 async function uploadLogo(file:File|undefined,slot:'logo'|'logo2'){if(!file)return;if(file.type!=='image/png'||!/\.png$/i.test(file.name)){setStatus('Sube el logotipo como PNG sin fondo.');return}const url=URL.createObjectURL(file);try{const p=await image(url,file.name);if(slot==='logo2'){setLogo2(p);setLogo2Id('local')}else{setLogo(p);setLogoId('local')}}catch(e){setStatus((e as Error).message)}finally{URL.revokeObjectURL(url)}}

 function uploadVideo(file:File|undefined){
  if(!file)return;
  if(!file.type.startsWith('video/')){setStatus('Selecciona un archivo de video.');return}
  const v=videoRef.current;if(!v)return;
  const url=URL.createObjectURL(file);
  const previous=videoUrlRef.current;
  v.onloadedmetadata=()=>{
   if(previous)URL.revokeObjectURL(previous);
   videoUrlRef.current=url;
   setVideoInfo({name:file.name,width:v.videoWidth,height:v.videoHeight,duration:v.duration});
   const fullDuration=Number.isFinite(v.duration)&&v.duration>0?v.duration:0;
   setTimings({logo:{all:true,start:0,end:fullDuration},logo2:{all:true,start:0,end:fullDuration},text:{all:true,start:0,end:fullDuration}});
   setScrub(0);
   const scale=Math.min(1,MAX_DIMENSION/Math.max(v.videoWidth,v.videoHeight));
   const canvas=canvasRef.current;
   if(canvas){canvas.width=Math.round(v.videoWidth*scale);canvas.height=Math.round(v.videoHeight*scale)}
   const durationLabel=Number.isFinite(v.duration)?`${Math.round(v.duration)} s`:'duración no disponible';
   setStatus(`${v.videoWidth} × ${v.videoHeight} px · ${durationLabel}. Video listo.`);
   redraw();
  };
  v.onerror=()=>{URL.revokeObjectURL(url);setStatus('No se pudo abrir el video.')};
  v.src=url;
  v.load();
 }

 function textLayout(ctx:CanvasRenderingContext2D){ctx.font=`200px "${family}"`;ctx.textAlign='left';ctx.textBaseline='alphabetic';const lines=text.split('\n').slice(0,6);const metrics=lines.map(line=>ctx.measureText(line||' '));const ascent=Math.max(200,...metrics.map(m=>m.actualBoundingBoxAscent||0)),descent=Math.max(50,...metrics.map(m=>m.actualBoundingBoxDescent||0));const lineHeight=ascent+descent+20;const width=Math.max(1,...metrics.map(m=>Math.max(m.width,m.actualBoundingBoxRight||0)+Math.max(0,m.actualBoundingBoxLeft||0)))+40;return{lines,metrics,width,height:lineHeight*lines.length+40,lineHeight,ascent}}
 function layerDims(which:Target,width:number,ctx:CanvasRenderingContext2D){const t=transforms[which];const w=width*t.size;if(which!=='text'){const pic=which==='logo2'?logo2:logo;return{w,h:pic?w*pic.height/pic.width:w}}const l=textLayout(ctx);return{w,h:w*l.height/l.width}}
 function drawLayer(ctx:CanvasRenderingContext2D,which:Target,width:number,height:number){if(which==='logo'&&(!logo||!showLogo))return;if(which==='logo2'&&(!logo2||!showLogo2||!secondEnabled))return;if(which==='text'&&(!text.trim()||!family||fontBusy))return;const timing=timings[which],time=videoRef.current?.currentTime??0;if(!timing.all&&(time<timing.start||time>timing.end))return;const t=transforms[which];const{w,h}=layerDims(which,width,ctx);ctx.save();ctx.translate(t.x*width,t.y*height);ctx.rotate(t.rotation*Math.PI/180);ctx.globalAlpha=t.opacity;if(which!=='text')ctx.drawImage((which==='logo2'?logo2:logo)!.el,-w/2,-h/2,w,h);else{const l=textLayout(ctx);ctx.translate(-w/2,-h/2);ctx.scale(w/l.width,w/l.width);ctx.font=`200px "${family}"`;ctx.fillStyle=color;ctx.textBaseline='alphabetic';l.lines.forEach((line,i)=>{const m=l.metrics[i];const left=Math.max(0,m.actualBoundingBoxLeft||0);ctx.fillText(line,20+left+(l.width-40-m.width-left)/2,20+l.ascent+i*l.lineHeight)})}ctx.restore()}
 function drawFrame(){const canvas=canvasRef.current,v=videoRef.current;if(!canvas||!v||!videoInfo)return;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(v,0,0,canvas.width,canvas.height);drawLayer(ctx,'logo',canvas.width,canvas.height);drawLayer(ctx,'logo2',canvas.width,canvas.height);drawLayer(ctx,'text',canvas.width,canvas.height)}
 function redraw(){requestAnimationFrame(drawFrame)}
 useEffect(()=>{redraw()},[videoInfo,logo,showLogo,logo2,showLogo2,secondEnabled,text,color,family,fontBusy,transforms,timings]);

 function update(p:Partial<Transform>){setTransforms(t=>({...t,[target]:{...t[target],...p}}))}
 function updateTiming(p:Partial<Timing>){
  setTimings(all=>{
   const max=videoInfo&&Number.isFinite(videoInfo.duration)?Math.max(0,videoInfo.duration):0;
   const next={...all[target],...p};
   next.start=clamp(Number(next.start)||0,0,max);
   next.end=clamp(Number(next.end)||0,0,max);
   if(next.start>next.end){
    if(Object.prototype.hasOwnProperty.call(p,'start'))next.end=next.start;
    else next.start=next.end;
   }
   return {...all,[target]:next};
  });
 }
 function point(e:PE<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}}
 function center(a:{x:number;y:number},b:{x:number;y:number}){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(b.x-a.x,b.y-a.y)}
 function angle(a:{x:number;y:number},b:{x:number;y:number}){return Math.atan2(b.y-a.y,b.x-a.x)}
 function hitTarget(c:HTMLCanvasElement,p:{x:number;y:number}){const ctx=c.getContext('2d');if(!ctx)return null;const r=c.getBoundingClientRect();const pad=Math.max(18,28*c.width/Math.max(r.width,1));for(const which of ['text','logo2','logo'] as Target[]){if(which==='logo'&&(!logo||!showLogo)||which==='logo2'&&(!logo2||!showLogo2||!secondEnabled)||which==='text'&&(!text.trim()||!family))continue;const t=transforms[which],d=layerDims(which,c.width,ctx),a=-t.rotation*Math.PI/180,dx=p.x-t.x*c.width,dy=p.y-t.y*c.height;const x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(x)<=d.w/2+pad&&Math.abs(y)<=d.h/2+pad)return which}return null}
 function down(e:PE<HTMLCanvasElement>){
  e.preventDefault();
  const c=e.currentTarget,p=point(e);pointers.current.set(e.pointerId,p);
  try{c.setPointerCapture(e.pointerId)}catch{}
  const active=[...pointers.current.entries()];
  if(active.length===1){
   const which=hitTarget(c,p);if(!which){gesture.current=null;return}
   setTarget(which);const t=transforms[which];
   gesture.current={target:which,mode:'drag',pointerIds:[e.pointerId],startCenter:p,startDistance:0,startAngle:0,start:{...t},dragOffset:{x:p.x-t.x*c.width,y:p.y-t.y*c.height}};
   setStatus('Elemento seleccionado. Arrástralo con un dedo; usa dos dedos para tamaño y rotación.');
  }else if(active.length>=2){
   const [a,b]=active.slice(0,2);const which=gesture.current?.target??target,p1=a[1],p2=b[1],m=center(p1,p2),t=transforms[which];
   gesture.current={target:which,mode:'pinch',pointerIds:[a[0],b[0]],startCenter:m,startDistance:Math.max(1,distance(p1,p2)),startAngle:angle(p1,p2),start:{...t},dragOffset:{x:0,y:0}};
  }
 }
 function move(e:PE<HTMLCanvasElement>){
  if(!pointers.current.has(e.pointerId))return;e.preventDefault();
  const c=e.currentTarget,p=point(e);pointers.current.set(e.pointerId,p);
  const g=gesture.current;if(!g)return;
  const active=g.pointerIds.map(id=>pointers.current.get(id)).filter(Boolean) as {x:number;y:number}[];
  if(g.mode==='pinch'&&active.length>=2){
   const p1=active[0],p2=active[1],m=center(p1,p2),ratio=distance(p1,p2)/Math.max(1,g.startDistance),delta=(angle(p1,p2)-g.startAngle)*180/Math.PI;
   setTransforms(all=>({...all,[g.target]:{...all[g.target],x:clamp((g.start.x*c.width+(m.x-g.startCenter.x))/c.width,0,1),y:clamp((g.start.y*c.height+(m.y-g.startCenter.y))/c.height,0,1),size:clamp(g.start.size*ratio,.05,1.5),rotation:Math.round(g.start.rotation+delta)}}));
  }else if(g.mode==='drag'&&active.length>=1){
   const q=active[0];
   setTransforms(all=>({...all,[g.target]:{...all[g.target],x:clamp((q.x-g.dragOffset.x)/c.width,0,1),y:clamp((q.y-g.dragOffset.y)/c.height,0,1)}}));
  }
 }
 function endPointer(e:PE<HTMLCanvasElement>){
  e.preventDefault();pointers.current.delete(e.pointerId);
  try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}
  const g=gesture.current;if(!g)return;
  const remaining=[...pointers.current.entries()];
  if(!remaining.length){gesture.current=null;return}
  const [id,p]=remaining[0];const current=transforms[g.target];
  gesture.current={target:g.target,mode:'drag',pointerIds:[id],startCenter:p,startDistance:0,startAngle:0,start:{...current},dragOffset:{x:p.x-current.x*e.currentTarget.width,y:p.y-current.y*e.currentTarget.height}};
 }
 function quick(i:number){const c=canvasRef.current,ctx=c?.getContext('2d');if(!c||!ctx||!videoInfo)return;const d=layerDims(target,c.width,ctx),a=transforms[target].rotation*Math.PI/180;const mx=Math.min(.5,(Math.abs(d.w*Math.cos(a))+Math.abs(d.h*Math.sin(a)))/2/c.width+.02),my=Math.min(.5,(Math.abs(d.w*Math.sin(a))+Math.abs(d.h*Math.cos(a)))/2/c.height+.02);update({x:[mx,.5,1-mx][i%3],y:[my,.5,1-my][Math.floor(i/3)]})}

 function scrubTo(time:number){const v=videoRef.current;if(!v||!videoInfo)return;setScrub(time);v.currentTime=time}
 function focusTiming(which:Target){setTarget(which);requestAnimationFrame(()=>document.getElementById('video-element-settings')?.scrollIntoView({behavior:'smooth',block:'start'}))}

 async function exportVideo(){
  const canvas=canvasRef.current,v=videoRef.current;
  if(!canvas||!v||!videoInfo||busy||fontBusy||(text.trim()&&!family))return;
  const mime=pickMime();
  if(!mime){setStatus('Tu navegador no permite grabar video aquí. Prueba con Chrome, Edge o Firefox actualizados.');return}
  const canvasStream=(canvas as HTMLCanvasElement&{captureStream?:(fps?:number)=>MediaStream}).captureStream?.(30);
  const sourceStream=captureMedia(v);
  if(!canvasStream||!sourceStream){setStatus('No se pudo iniciar la grabación en este navegador.');return}
  const mixed=new MediaStream([...canvasStream.getVideoTracks(),...sourceStream.getAudioTracks()]);
  let recorder:MediaRecorder;
  try{recorder=new MediaRecorder(mixed,{mimeType:mime,videoBitsPerSecond:6_000_000})}catch{setStatus('No se pudo iniciar la grabación en este navegador.');return}
  const chunks:BlobPart[]=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  setBusy(true);setProgress(0);setStatus('Grabando…');
  const wasMuted=v.muted;
  v.muted=true;
  v.currentTime=0;
  await new Promise(res=>setTimeout(res,80));
  let raf=0;
  const durationKnown=Number.isFinite(videoInfo.duration)&&videoInfo.duration>0;
  const loop=()=>{if(v.paused||v.ended)return;drawFrame();setProgress(durationKnown?Math.min(99,Math.round(v.currentTime/videoInfo.duration*100)):0);raf=requestAnimationFrame(loop)};
  recorder.start(250);
  try{await v.play()}catch{}
  raf=requestAnimationFrame(loop);
  await new Promise<void>(res=>{v.onended=()=>res()});
  cancelAnimationFrame(raf);
  await new Promise(res=>setTimeout(res,200));
  const blob=await new Promise<Blob>(resolve=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:mime.split(';')[0]}));recorder.stop()});
  const ext=mime.startsWith('video/mp4')?'mp4':'webm';
  downloadBlob(blob,`${videoInfo.name.replace(/\.[^.]+$/,'')}-FGDLL.${ext}`);
  v.muted=wasMuted;
  v.currentTime=0;
  setProgress(null);setBusy(false);setStatus('Video listo. Se descargó a tu dispositivo.');
 }

 const t=transforms[target];
 const timing=timings[target];
 const duration=videoInfo&&Number.isFinite(videoInfo.duration)?Math.max(0,videoInfo.duration):0;
 const targetLabel=target==='logo'?'Logo 1':target==='logo2'?'Logo 2':'Texto';
 return <main className="brand-app brand-video-artifact">
  <div className="brand-container">
   <p className="brand-eyebrow">FGDLL · HERRAMIENTAS INSTITUCIONALES</p>
   <h1>Tu video, con identidad.</h1>
   <p className="brand-lead">Sube un video, coloca hasta dos logotipos y un texto, y ajústalos directamente sobre la pantalla. Un dedo mueve; dos dedos cambian tamaño y rotación. Todo se procesa en tu dispositivo.</p>

   <div className="brand-editor-layout">
    <section className="brand-card brand-workspace brand-video-workspace">
     <label className="brand-upload brand-upload-compact">{videoInfo?'Cambiar video':'Subir video'}<input type="file" accept="video/*" onChange={e=>{uploadVideo(e.target.files?.[0]);e.target.value=''}}/></label>
     <div className="brand-canvas-wrap" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();uploadVideo(e.dataTransfer.files[0])}}>
      {!videoInfo?<div className="brand-empty"><strong>Tu video aparecerá aquí</strong><span>Selecciona un archivo para comenzar.</span></div>:<canvas ref={canvasRef} aria-label="Video con logo y texto. Toca un elemento para moverlo; pellizca con dos dedos para cambiar tamaño y rotación." onPointerDown={down} onPointerMove={move} onPointerUp={endPointer} onPointerCancel={endPointer} onPointerLeave={e=>{if(e.pointerType==='mouse'&&e.buttons===0)endPointer(e)}}/>}
      <video ref={videoRef} playsInline onSeeked={()=>redraw()} onLoadedData={()=>redraw()} style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}}/>
     </div>
     {videoInfo&&<><p className="brand-hint brand-touch-hint"><strong>Edición táctil:</strong> toca un logo o texto para seleccionarlo; arrástralo con un dedo. Pellizca con dos dedos para agrandar o reducir y gira los dedos para rotarlo.</p><p className="brand-hint">{videoInfo.width} × {videoInfo.height} px · {Number.isFinite(videoInfo.duration)?`${Math.round(videoInfo.duration)} s`:'duración no disponible'} · Se exporta hasta {MAX_DIMENSION}px en su lado mayor.</p><label>Vista previa en el segundo {scrub.toFixed(1)}<input type="range" min={0} max={Number.isFinite(videoInfo.duration)?Math.max(videoInfo.duration-.1,0):0} step={.1} value={scrub} onChange={e=>scrubTo(Number(e.target.value))} disabled={busy}/></label></>}
     <p className="brand-status" role="status">{status}</p>
     {recordError&&<p role="alert" className="brand-error">{recordError}</p>}
    </section>

    <aside className="brand-controls">
     <section className="brand-card">
      <h2>1. Logotipo principal</h2>
      {catalogLoading&&<p className="brand-hint">Cargando galería de logotipos…</p>}
      {catalogError&&<p role="alert" className="brand-error">{catalogError} <button onClick={()=>void refresh()}>Reintentar</button></p>}
      <p className="brand-hint">Elige un PNG sin fondo de la base institucional o sube el tuyo.</p>
      <div className="brand-logo-gallery brand-video-logo-gallery">{resources.filter(r=>r.kind==='logo').map(r=><button key={r.id} className={logoId===r.id?'selected':''} aria-pressed={logoId===r.id} onClick={()=>{void chooseLogo(r,'logo');setTarget('logo')}}><img src={r.url} alt=""/><span>{r.name}</span></button>)}</div>
      <label className="brand-upload brand-upload-compact secondary">Subir logo (PNG sin fondo)<input type="file" accept="image/png" onChange={e=>{void uploadLogo(e.target.files?.[0],'logo');e.target.value='';setTarget('logo')}}/></label>
      <label className="brand-check"><input type="checkbox" checked={showLogo} onChange={e=>setShowLogo(e.target.checked)}/>Mostrar logo</label>
      <button type="button" onClick={()=>focusTiming('logo')}>Elegir tiempo de Logo 1</button>
     </section>

     <section className="brand-card">
      <h2>Segundo logotipo</h2>
      {!secondEnabled?
       <button className="brand-add-logo" onClick={()=>{setSecondEnabled(true);setTarget('logo2')}}>Añadir un logotipo más</button>:
       <div className="brand-second-logo">
        <p className="brand-hint">Elige otro PNG sin fondo de la misma base institucional.</p>
        <div className="brand-logo-gallery brand-video-logo-gallery">{resources.filter(r=>r.kind==='logo').map(r=><button key={r.id} className={logo2Id===r.id?'selected':''} aria-pressed={logo2Id===r.id} onClick={()=>{void chooseLogo(r,'logo2');setTarget('logo2')}}><img src={r.url} alt=""/><span>{r.name}</span></button>)}</div>
        <label className="brand-upload brand-upload-compact secondary">Subir segundo logo (PNG sin fondo)<input type="file" accept="image/png" onChange={e=>{void uploadLogo(e.target.files?.[0],'logo2');e.target.value='';setTarget('logo2')}}/></label>
        <label className="brand-check"><input type="checkbox" checked={showLogo2} onChange={e=>setShowLogo2(e.target.checked)}/>Mostrar segundo logo</label>
        <button type="button" onClick={()=>focusTiming('logo2')}>Elegir tiempo de Logo 2</button>
        <button onClick={()=>{++logo2Request.current;setSecondEnabled(false);setLogo2(null);setLogo2Id('');setShowLogo2(true);setTransforms(t=>({...t,logo2:initialLogo2}));if(target==='logo2')setTarget('logo')}}>Quitar segundo logo</button>
       </div>}
     </section>

     <section className="brand-card">
      <h2>2 · Texto</h2>
      {resources.some(r=>r.kind==='text')&&<><p className="brand-hint">Elige un texto de la base institucional o escribe uno personalizado.</p><div className="brand-actions brand-text-presets">{resources.filter(r=>r.kind==='text').map(r=><button type="button" key={r.id} className={(r.content??r.name)===text?'selected':''} aria-pressed={(r.content??r.name)===text} onClick={()=>{setText((r.content??r.name).split('\n').slice(0,6).join('\n'));setTarget('text')}}>{r.name}</button>)}</div></>}
      <label>Texto del logotipo<textarea rows={3} maxLength={240} value={text} placeholder="Nombre de tu grupo o frase" onChange={e=>{setText(e.target.value.split('\n').slice(0,6).join('\n'));setTarget('text')}}/></label>
      <label>Tipografía de la base institucional<select value={fontId} onChange={e=>setFontId(e.target.value)}><option value="" disabled>Selecciona una tipografía</option>{resources.filter(r=>r.kind==='font').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      {fontBusy&&<p role="status" className="brand-hint">Cargando tipografía…</p>}
      {fontError&&<p role="alert" className="brand-error">{fontError}</p>}
      <label>Color del texto<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
      <button type="button" onClick={()=>focusTiming('text')}>Elegir tiempo del Texto</button>
     </section>

     <section className="brand-card" id="video-element-settings">
      <h2>3 · Ajusta cada elemento</h2>
      <div className="brand-actions"><button aria-pressed={target==='logo'} className={target==='logo'?'selected':''} onClick={()=>setTarget('logo')}>Logo 1</button>{secondEnabled&&<button aria-pressed={target==='logo2'} className={target==='logo2'?'selected':''} onClick={()=>setTarget('logo2')}>Logo 2</button>}<button aria-pressed={target==='text'} className={target==='text'?'selected':''} onClick={()=>setTarget('text')}>Texto</button></div>
      <div className="brand-positions">{positions.map((label,i)=><button key={label} aria-label={label} title={label} disabled={!videoInfo} onClick={()=>quick(i)}><span style={{justifySelf:['start','center','end'][i%3],alignSelf:['start','center','end'][Math.floor(i/3)]}}>•</span></button>)}</div>
      <label>Tamaño: {Math.round(t.size*100)}%<input type="range" min=".05" max="1" step=".01" value={t.size} onChange={e=>update({size:Number(e.target.value)})}/></label>
      <label>Opacidad: {Math.round(t.opacity*100)}%<input type="range" min=".1" max="1" step=".01" value={t.opacity} onChange={e=>update({opacity:Number(e.target.value)})}/></label>
      <label>Rotación: {t.rotation}°<input type="range" min="-180" max="180" step="1" value={t.rotation} onChange={e=>update({rotation:Number(e.target.value)})}/></label>
      <div className="brand-timing">
       <div className="brand-timing-head"><strong>Tiempo de {targetLabel}</strong>{videoInfo&&<span>{timing.all?'Todo el video':`${timing.start.toFixed(1)} s — ${timing.end.toFixed(1)} s`}</span>}</div>
       <label className="brand-check brand-all-video"><input type="checkbox" checked={timing.all} onChange={e=>updateTiming({all:e.target.checked})}/>Mostrar durante todo el video</label>
       {videoInfo&&!timing.all&&<div className="brand-time-controls">
        <label>Empieza en <strong>{timing.start.toFixed(1)} s</strong><input type="range" min="0" max={duration} step=".1" value={timing.start} onChange={e=>updateTiming({start:Number(e.target.value)})}/><input type="number" min="0" max={duration} step=".1" value={timing.start} onChange={e=>updateTiming({start:Number(e.target.value)})}/></label>
        <label>Termina en <strong>{timing.end.toFixed(1)} s</strong><input type="range" min="0" max={duration} step=".1" value={timing.end} onChange={e=>updateTiming({end:Number(e.target.value)})}/><input type="number" min="0" max={duration} step=".1" value={timing.end} onChange={e=>updateTiming({end:Number(e.target.value)})}/></label>
       </div>}
       {!videoInfo&&<p className="brand-hint">Sube un video para elegir el segundo exacto de entrada y salida.</p>}
      </div>
      <button className="brand-reset" onClick={()=>update(target==='logo'?initialLogo:target==='logo2'?initialLogo2:initialText)}>Restablecer</button>
     </section>

     <section className="brand-card brand-export">
      <h2>4 · Descarga tu video</h2>
      <button className="brand-primary" disabled={!videoInfo||busy||fontBusy||!!recordError||(!!text.trim()&&!family)} onClick={()=>void exportVideo()}>{busy?`Grabando… ${progress??0}%`:'Descargar video'}</button>
      <p className="brand-hint">La descarga tarda lo mismo que la duración del video (se graba en tiempo real) y se guarda en WebM o MP4 según lo soporte tu navegador. Funciona mejor en Chrome, Edge o Firefox actualizados; en Safari/iPhone puede no estar disponible.</p>
     </section>
    </aside>
   </div>
  </div>
 </main>;
}
