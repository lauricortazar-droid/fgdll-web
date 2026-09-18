import Link from "next/link";

export const metadata = {
  title: "Herramientas | FGDLL",
  description: "Herramientas institucionales de la Fraternidad Guerreros de la Luz.",
};

export default function HerramientasPage() {
  return (
    <main style={{minHeight:"100vh",background:"#090909",color:"#f4efe4",fontFamily:"Inter,system-ui,sans-serif",padding:"48px 20px"}}>
      <div style={{width:"min(900px,100%)",margin:"0 auto"}}>
        <Link href="/" style={{color:"#c79b46",textDecoration:"none",fontSize:13}}>← Volver a fgdll.org</Link>
        <p style={{margin:"42px 0 8px",color:"#c79b46",fontSize:11,fontWeight:800,letterSpacing:".18em",textTransform:"uppercase"}}>FGDLL · Herramientas institucionales</p>
        <h1 style={{fontSize:"clamp(36px,7vw,68px)",letterSpacing:"-.05em",lineHeight:1,margin:"0 0 18px"}}>Herramientas para servir mejor.</h1>
        <p style={{maxWidth:680,color:"#aaa398",lineHeight:1.65,margin:"0 0 34px"}}>Recursos sencillos para preparar materiales de Guerreros de la Luz desde el celular o la computadora.</p>

        <Link href="/herramientas/marca-imagenes" style={{display:"block",textDecoration:"none",color:"inherit",border:"1px solid #343027",borderRadius:20,padding:24,background:"#12110f"}}>
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <img src="/logo-gdll.png" alt="" style={{width:64,height:76,objectFit:"contain"}} />
            <div><span style={{display:"block",color:"#c79b46",fontSize:10,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",marginBottom:7}}>Imagen institucional</span><strong style={{display:"block",fontSize:22,marginBottom:6}}>Marca de imágenes</strong><span style={{color:"#9c968a",fontSize:13,lineHeight:1.5}}>Coloca el escudo u otro logotipo, ajusta posición, tamaño y opacidad, y descarga el resultado.</span></div>
          </div>
        </Link>

        <Link href="/herramientas/marca-videos" style={{display:"block",textDecoration:"none",color:"inherit",border:"1px solid #343027",borderRadius:20,padding:24,background:"#12110f",marginTop:16}}>
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <img src="/logo-gdll.png" alt="" style={{width:64,height:76,objectFit:"contain"}} />
            <div><span style={{display:"block",color:"#c79b46",fontSize:10,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",marginBottom:7}}>Imagen institucional</span><strong style={{display:"block",fontSize:22,marginBottom:6}}>Marca de videos</strong><span style={{color:"#9c968a",fontSize:13,lineHeight:1.5}}>Sube un video, coloca hasta dos logotipos y texto, y descárgalo con la marca aplicada.</span></div>
          </div>
        </Link>

        <a
          href="https://claude.ai/share/443d6bb8-5b0f-4795-a8b8-1211580839e4"
          target="_blank"
          rel="noopener noreferrer"
          style={{display:"block",textDecoration:"none",color:"inherit",border:"1px solid #343027",borderRadius:20,padding:24,background:"#12110f",marginTop:16}}
        >
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <div aria-hidden="true" style={{width:64,height:64,borderRadius:18,border:"1px solid #4a4337",display:"grid",placeItems:"center",color:"#c79b46",fontSize:30,fontWeight:700,flex:"0 0 auto"}}>↗</div>
            <div>
              <span style={{display:"block",color:"#c79b46",fontSize:10,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",marginBottom:7}}>Recurso externo</span>
              <strong style={{display:"block",fontSize:22,marginBottom:6}}>Herramienta compartida</strong>
              <span style={{color:"#9c968a",fontSize:13,lineHeight:1.5}}>Abre el recurso compartido en Claude en una pestaña nueva.</span>
            </div>
          </div>
        </a>
      </div>
    </main>
  );
}
