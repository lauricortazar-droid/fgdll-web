import Link from "next/link";

export function Mark() {
  return <span className="brand-shield" aria-hidden="true"><img src="/logo-gdll.png" alt="" /></span>;
}

export function SubHeader({ label }: { label: string }) {
  return <header className="topbar sub-topbar"><div className="shell nav-shell"><Link className="brand" href="/"><Mark /><span><strong>FGDLL</strong><small>{label}</small></span></Link><nav className="sub-nav"><Link href="/">Inicio</Link><Link href="/portal">Portal de líderes</Link><Link href="/universidad">Formación</Link><Link href="/testimonios">Testimonios</Link><Link href="/#directorio">Directorio</Link><Link href="/centros">Centros</Link><Link className="button button-gold button-small" href="/etica">Ética</Link></nav></div></header>;
}

export function SubFooter() {
  return <footer className="footer"><div className="shell footer-grid"><div className="footer-brand"><Mark /><div><strong>Fraternidad Guerreros de la Luz</strong><span>Unidad · Servicio · Responsabilidad</span></div></div><div className="footer-links"><Link href="/">Inicio</Link><Link href="/portal">Portal</Link><Link href="/universidad">Universidad</Link><Link href="/testimonios">Testimonios</Link><Link href="/centros">Centros</Link></div><p>© 2026 FGDLL<br />Portal institucional.</p></div></footer>;
}
