"use client";

import Link from "next/link";
import { ChangeEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

type Img = { el: HTMLImageElement; name: string; width: number; height: number };
type Point = { x: number; y: number };
type Format = "png" | "jpeg" | "webp";

const DEFAULT_LOGO = "/logo-gdll.png";
const MAX_PREVIEW = 1500;

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, "-");
}

export default function MarcaImagenesPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const [photo, setPhoto] = useState<Img | null>(null);
  const [logo, setLogo] = useState<Img | null>(null);
  const [logoMode, setLogoMode] = useState<"escudo" | "otro">("escudo");
  const [pos, setPos] = useState<Point>({ x: .84, y: .82 });
  const [size, setSize] = useState(.18);
  const [opacity, setOpacity] = useState(.92);
  const [rotation, setRotation] = useState(0);
  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(.92);
  const [status, setStatus] = useState("Sube una imagen para comenzar.");
  const [exporting, setExporting] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    document.title = "Marca de Imágenes | FGDLL";
    load(DEFAULT_LOGO).then((el) => setLogo({ el, name: "Escudo FGDLL", width: el.naturalWidth, height: el.naturalHeight })).catch(() => setStatus("No se pudo cargar el escudo institucional."));
  }, []);

  const dims = useCallback(() => {
    if (!photo) return { width: 1000, height: 700 };
    const s = Math.min(1, MAX_PREVIEW / Math.max(photo.width, photo.height));
    return { width: Math.max(1, Math.round(photo.width * s)), height: Math.max(1, Math.round(photo.height * s)) };
  }, [photo]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const d = dims();
    if (canvas.width !== d.width) canvas.width = d.width;
    if (canvas.height !== d.height) canvas.height = d.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#12110f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!photo) {
      ctx.fillStyle = "#aaa398";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.max(17, canvas.width * .025)}px system-ui`;
      ctx.fillText("Vista previa", canvas.width / 2, canvas.height / 2 - 14);
      ctx.font = `${Math.max(12, canvas.width * .015)}px system-ui`;
      ctx.fillText("Tu imagen aparecerá aquí", canvas.width / 2, canvas.height / 2 + 18);
      return;
    }
    ctx.drawImage(photo.el, 0, 0, canvas.width, canvas.height);
    if (!logo) return;
    const w = canvas.width * size;
    const h = w * logo.height / logo.width;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(pos.x * canvas.width, pos.y * canvas.height);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(logo.el, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [dims, logo, opacity, photo, pos, rotation, size]);

  useEffect(() => { draw(); }, [draw]);

  async function setPhotoFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus("Selecciona un archivo de imagen.");
    const url = URL.createObjectURL(file);
    try {
      const el = await load(url);
      setPhoto({ el, name: file.name || "imagen", width: el.naturalWidth, height: el.naturalHeight });
      setPos({ x: .84, y: .82 });
      setStatus(`${el.naturalWidth} × ${el.naturalHeight} px · lista para editar.`);
    } catch { setStatus("No se pudo abrir esta imagen."); }
    finally { URL.revokeObjectURL(url); }
  }

  async function setLogoFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) return setStatus("Usa un logo PNG, JPG, WebP o SVG.");
    const url = URL.createObjectURL(file);
    try {
      const el = await load(url);
      setLogo({ el, name: file.name, width: el.naturalWidth, height: el.naturalHeight });
      setLogoMode("otro");
      setStatus(`Logo cargado: ${file.name}`);
    } catch { setStatus("No se pudo abrir ese logotipo."); }
    finally { URL.revokeObjectURL(url); }
  }

  async function useShield() {
    try {
      const el = await load(DEFAULT_LOGO);
      setLogo({ el, name: "Escudo FGDLL", width: el.naturalWidth, height: el.naturalHeight });
      setLogoMode("escudo");
      setStatus("Escudo institucional seleccionado.");
    } catch { setStatus("No se pudo cargar el escudo institucional."); }
  }

  function quick(key: string) {
    const m = .09;
    const p: Record<string, Point> = {
      tl:{x:m,y:m}, tc:{x:.5,y:m}, tr:{x:1-m,y:m}, ml:{x:m,y:.5}, mc:{x:.5,y:.5}, mr:{x:1-m,y:.5}, bl:{x:m,y:1-m}, bc:{x:.5,y:1-m}, br:{x:1-m,y:1-m}
    };
    if (p[key]) setPos(p[key]);
  }

  function point(e: ReactPointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height };
  }

  function down(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!photo || !logo || !canvasRef.current) return;
    const c = canvasRef.current;
    const p = point(e);
    const cx = pos.x * c.width, cy = pos.y * c.height;
    const w = c.width * size, h = w * logo.height / logo.width;
    if (Math.hypot(p.x - cx, p.y - cy) > Math.max(w, h) * .7) return;
    dragRef.current = { id: e.pointerId, dx: p.x - cx, dy: p.y - cy };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = dragRef.current, c = canvasRef.current;
    if (!d || d.id !== e.pointerId || !c) return;
    const p = point(e);
    setPos({ x: clamp((p.x - d.dx) / c.width, 0, 1), y: clamp((p.y - d.dy) / c.height, 0, 1) });
  }

  function up(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  }

  async function download() {
    if (!photo || !logo) return setStatus("Primero sube una imagen.");
    setExporting(true);
    setStatus("Preparando archivo en resolución original…");
    try {
      const out = document.createElement("canvas");
      out.width = photo.width; out.height = photo.height;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error();
      ctx.drawImage(photo.el, 0, 0, out.width, out.height);
      const w = out.width * size, h = w * logo.height / logo.width;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(pos.x * out.width, pos.y * out.height);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(logo.el, -w / 2, -h / 2, w, h);
      ctx.restore();
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, `image/${format}`, format === "png" ? undefined : quality));
      if (!blob) throw new Error();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName(photo.name)}-FGDLL.${format === "jpeg" ? "jpg" : format}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      setStatus(`Archivo listo · ${photo.width} × ${photo.height} px.`);
    } catch { setStatus("No se pudo generar el archivo. Prueba otro formato o una imagen más pequeña."); }
    finally { setExporting(false); }
  }

  function reset() {
    setPos({ x: .84, y: .82 }); setSize(.18); setOpacity(.92); setRotation(0); setStatus("Ajustes restablecidos.");
  }

  const positions = ["tl","tc","tr","ml","mc","mr","bl","bc","br"];

  return <main className="mie-page">
    <style>{`
      .mie-page{min-height:100vh;background:#090909;color:#f4efe4;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding-bottom:56px}.mie-page *{box-sizing:border-box}.mie-shell{width:min(1220px,calc(100% - 28px));margin:auto}.mie-top{position:sticky;top:0;z-index:20;background:rgba(9,9,9,.92);backdrop-filter:blur(15px);border-bottom:1px solid #29261f}.mie-topin{height:68px;display:flex;align-items:center;justify-content:space-between;gap:15px}.mie-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}.mie-brand img{width:37px;height:44px;object-fit:contain}.mie-brand strong{display:block;font-size:13px;letter-spacing:.14em}.mie-brand small{display:block;color:#9f998d;font-size:10px;margin-top:2px}.mie-back{color:#d5ccb9;text-decoration:none;border:1px solid #39342b;border-radius:999px;padding:8px 12px;font-size:12px}.mie-hero{padding:38px 0 24px}.mie-kicker{color:#c79b46;font-size:10px;font-weight:800;letter-spacing:.19em;text-transform:uppercase}.mie-hero h1{font-size:clamp(32px,5vw,58px);line-height:1;letter-spacing:-.045em;margin:11px 0 13px}.mie-hero p{max-width:760px;margin:0;color:#a9a397;line-height:1.6;font-size:14px}.mie-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.5fr);gap:17px;align-items:start}.mie-panel,.mie-card{background:#11110f;border:1px solid #2b2821;border-radius:20px}.mie-panel{overflow:hidden}.mie-canvaswrap{min-height:430px;padding:14px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#29261f,#111 58%,#090909);transition:.15s}.mie-canvaswrap.over{outline:2px solid #c79b46;outline-offset:-6px}.mie-canvas{max-width:100%;max-height:72vh;width:auto;height:auto;display:block;box-shadow:0 20px 52px rgba(0,0,0,.4);touch-action:none;cursor:grab}.mie-bar{border-top:1px solid #2b2821;padding:13px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.mie-file,.mie-btn{border:0;border-radius:11px;padding:10px 13px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.mie-file{background:#f0e8d7;color:#17140f}.mie-file input,.mie-upload input{display:none}.mie-muted{color:#8e887d;font-size:10px;line-height:1.45}.mie-side{display:grid;gap:13px}.mie-card{padding:16px}.mie-card h2{font-size:13px;margin:0 0 12px}.mie-logos{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mie-logo,.mie-upload{min-height:90px;border:1px solid #39342b;border-radius:12px;background:#181713;color:#e6dece;display:grid;place-items:center;text-align:center;font:inherit;font-size:10px;cursor:pointer;padding:8px}.mie-logo.active,.mie-upload.active{border-color:#c79b46;box-shadow:inset 0 0 0 1px #c79b46}.mie-logo img{height:55px;max-width:72px;object-fit:contain;display:block;margin:auto}.mie-plus{font-size:28px;color:#c79b46;line-height:1}.mie-field{margin-top:13px}.mie-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px;font-size:11px;color:#c7bfae}.mie-row output{font-size:10px;color:#898378}.mie-field input[type=range]{width:100%;accent-color:#c79b46}.mie-pos{display:grid;grid-template-columns:repeat(3,42px);gap:6px}.mie-pos button{height:34px;border:1px solid #3a362c;background:#181713;border-radius:8px;position:relative;cursor:pointer}.mie-pos button:after{content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:#c79b46;left:50%;top:50%;transform:translate(-50%,-50%)}.mie-pos [data-p=tl]:after{left:8px;top:8px}.mie-pos [data-p=tc]:after{top:8px}.mie-pos [data-p=tr]:after{left:auto;right:8px;top:8px}.mie-pos [data-p=ml]:after{left:8px}.mie-pos [data-p=mr]:after{left:auto;right:8px}.mie-pos [data-p=bl]:after{left:8px;top:auto;bottom:8px}.mie-pos [data-p=bc]:after{top:auto;bottom:8px}.mie-pos [data-p=br]:after{left:auto;right:8px;top:auto;bottom:8px}.mie-select{width:100%;background:#191814;color:#eee6d5;border:1px solid #39352c;border-radius:10px;padding:10px;font:inherit;font-size:12px}.mie-btn.secondary{background:#1b1915;color:#d8d0c0;border:1px solid #39352c;margin-top:13px}.mie-btn.primary{width:100%;background:#c79b46;color:#15120d;padding:13px;margin-top:13px}.mie-btn:disabled{opacity:.5;cursor:not-allowed}.mie-status{font-size:10px;line-height:1.5;color:#999287;min-height:30px;margin:10px 0 0}.mie-privacy{border-top:1px solid #2b2821;margin-top:12px;padding-top:12px;color:#817b70;font-size:10px;line-height:1.5}.mie-tip{font-size:10px;color:#8f897e;line-height:1.45;margin:9px 0 0}.mie-tip strong{color:#d0c5ae}@media(max-width:900px){.mie-grid{grid-template-columns:1fr}.mie-side{grid-template-columns:1fr 1fr}.mie-export{grid-column:1/-1}.mie-canvaswrap{min-height:330px}}@media(max-width:620px){.mie-shell{width:calc(100% - 18px)}.mie-topin{height:60px}.mie-brand small{display:none}.mie-back{font-size:10px;padding:7px 9px}.mie-hero{padding:27px 2px 19px}.mie-hero h1{font-size:37px}.mie-hero p{font-size:12px}.mie-canvaswrap{min-height:290px;padding:7px}.mie-bar{padding:10px}.mie-file{width:100%;text-align:center}.mie-side{grid-template-columns:1fr}.mie-export{grid-column:auto}.mie-card{border-radius:15px}.mie-pos{grid-template-columns:repeat(3,1fr);width:100%}.mie-pos button{width:100%}}
    `}</style>
    <header className="mie-top"><div className="mie-shell mie-topin">
      <Link href="/" className="mie-brand"><img src="/logo-gdll.png" alt="FGDLL"/><span><strong>FGDLL</strong><small>Herramientas institucionales</small></span></Link>
      <Link href="/" className="mie-back">Volver a fgdll.org</Link>
    </div></header>

    <section className="mie-shell mie-hero"><span className="mie-kicker">Marca de imágenes</span><h1>Coloca el escudo donde debe ir.</h1><p>Sube una fotografía, usa el escudo de Guerreros de la Luz o agrega otro logotipo, muévelo con el dedo y descarga la imagen terminada en su resolución original.</p></section>

    <section className="mie-shell mie-grid">
      <div className="mie-panel">
        <div className={`mie-canvaswrap ${over ? "over" : ""}`} onDragOver={(e)=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)} onDrop={(e)=>{e.preventDefault();setOver(false);void setPhotoFile(e.dataTransfer.files?.[0])}}>
          <canvas ref={canvasRef} className="mie-canvas" aria-label="Vista previa" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
        </div>
        <div className="mie-bar"><label className="mie-file">{photo ? "Cambiar imagen" : "Subir imagen"}<input type="file" accept="image/*" onChange={(e:ChangeEvent<HTMLInputElement>)=>{void setPhotoFile(e.target.files?.[0]);e.target.value=""}}/></label><span className="mie-muted">También puedes arrastrar una imagen aquí.</span>{photo && <span className="mie-muted">{photo.width} × {photo.height} px</span>}</div>
      </div>

      <aside className="mie-side">
        <div className="mie-card"><h2>1. Logotipo</h2><div className="mie-logos">
          <button type="button" className={`mie-logo ${logoMode === "escudo" ? "active" : ""}`} onClick={()=>void useShield()}><span><img src={DEFAULT_LOGO} alt="Escudo Guerreros de la Luz"/>Escudo FGDLL</span></button>
          <label className={`mie-upload ${logoMode === "otro" ? "active" : ""}`}><span><span className="mie-plus">+</span><br/>Subir otro logo</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e:ChangeEvent<HTMLInputElement>)=>{void setLogoFile(e.target.files?.[0]);e.target.value=""}}/></label>
        </div><p className="mie-tip"><strong>Consejo:</strong> usa PNG o SVG con fondo transparente.</p></div>

        <div className="mie-card"><h2>2. Posición y tamaño</h2>
          <div className="mie-field"><div className="mie-row"><span>Posición rápida</span><output>o arrastra el logo</output></div><div className="mie-pos">{positions.map(k=><button key={k} type="button" data-p={k} aria-label={`Posición ${k}`} onClick={()=>quick(k)}/>)}</div></div>
          <div className="mie-field"><div className="mie-row"><span>Tamaño</span><output>{Math.round(size*100)}%</output></div><input type="range" min="0.05" max="0.5" step="0.01" value={size} onChange={e=>setSize(Number(e.target.value))}/></div>
          <div className="mie-field"><div className="mie-row"><span>Opacidad</span><output>{Math.round(opacity*100)}%</output></div><input type="range" min="0.15" max="1" step="0.01" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></div>
          <div className="mie-field"><div className="mie-row"><span>Rotación</span><output>{rotation}°</output></div><input type="range" min="-180" max="180" step="1" value={rotation} onChange={e=>setRotation(Number(e.target.value))}/></div>
          <button className="mie-btn secondary" type="button" onClick={reset}>Restablecer ajustes</button>
        </div>

        <div className="mie-card mie-export"><h2>3. Descargar</h2>
          <div className="mie-field"><div className="mie-row"><span>Formato</span></div><select className="mie-select" value={format} onChange={e=>setFormat(e.target.value as Format)}><option value="png">PNG · máxima compatibilidad</option><option value="jpeg">JPG · archivo más ligero</option><option value="webp">WebP · alta compresión</option></select></div>
          {format !== "png" && <div className="mie-field"><div className="mie-row"><span>Calidad</span><output>{Math.round(quality*100)}%</output></div><input type="range" min="0.55" max="1" step="0.01" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></div>}
          <button className="mie-btn primary" type="button" onClick={()=>void download()} disabled={!photo || !logo || exporting}>{exporting ? "Generando…" : "Descargar imagen"}</button>
          <p className="mie-status" role="status">{status}</p><div className="mie-privacy"><strong>Privacidad:</strong> la fotografía y el logo se procesan directamente en este dispositivo. No necesitan subirse a un servidor para generar la imagen final.</div>
        </div>
      </aside>
    </section>
  </main>;
}
