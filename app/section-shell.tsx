"use client";

import Link from "next/link";
import { useState } from "react";

export function Mark() {
  return <span className="brand-shield" aria-hidden="true"><img src="/logo-gdll.png" alt="" /></span>;
}

export function SubHeader({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return <header className="topbar sub-topbar"><div className="shell nav-shell"><Link className="brand" href="/" onClick={() => setOpen(false)}><Mark /><span><strong>FGDLL</strong><small>{label}</small></span></Link><button className="menu-button sub-menu-button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /><span /></button><nav className={open ? "sub-nav open" : "sub-nav"}><Link href="/" onClick={() => setOpen(false)}>Información pública</Link><Link href="/portal" onClick={() => setOpen(false)}>Liderazgo</Link><Link href="/etica" onClick={() => setOpen(false)}>Ética y educación</Link><Link href="/centros" onClick={() => setOpen(false)}>Centros</Link><Link className="button button-gold button-small" href="/administracion" onClick={() => setOpen(false)}>Administración</Link></nav></div></header>;
}

export function SubFooter() {
  return <footer className="footer"><div className="shell footer-grid"><div className="footer-brand"><Mark /><div><strong>Fraternidad Guerreros de la Luz A.C.</strong><span>Unidad · Servicio · Responsabilidad</span></div></div><div className="footer-links"><Link href="/">Público</Link><Link href="/portal">Liderazgo</Link><Link href="/etica">Ética</Link><Link href="/centros">Centros</Link><Link href="/administracion">Administración</Link></div><p>© 2026 FGDLL<br />Ecosistema institucional.</p></div></footer>;
}
