"use client";

import Link from "next/link";
import { useState } from "react";

export function Mark() {
  return (
    <span className="brand-shield" aria-hidden="true">
      <img src="/logo-gdll.png" alt="" />
    </span>
  );
}

export function SubHeader({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar sub-topbar">
      <div className="shell nav-shell">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <Mark />
          <span>
            <strong>FGDLL</strong>
            <small>{label}</small>
          </span>
        </Link>
        <button
          className="menu-button sub-menu-button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={open ? "sub-nav open" : "sub-nav"}>
          <Link href="/ayuda-adicciones-merida" onClick={() => setOpen(false)}>
            Necesito ayuda
          </Link>
          <Link href="/#directorio" onClick={() => setOpen(false)}>
            Encuentra un grupo
          </Link>
          <Link href="/centros" onClick={() => setOpen(false)}>
            Centros aliados
          </Link>
          <Link href="/#agenda" onClick={() => setOpen(false)}>
            Agenda
          </Link>
          <Link href="/formacion" onClick={() => setOpen(false)}>
            Formación
          </Link>
          <Link
            className="button button-gold button-small"
            href="/lider"
            onClick={() => setOpen(false)}
          >
            Portal del Líder
          </Link>
          <Link
            className="button button-small nav-report-link"
            href="/etica#reporte"
            onClick={() => setOpen(false)}
          >
            Quiero levantar un reporte
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SubFooter() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Mark />
          <div>
            <strong>Fraternidad Guerreros de la Luz A.C.</strong>
            <span>Que nadie sufra solo.</span>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/ayuda-adicciones-merida">Necesito ayuda</Link>
          <Link href="/#directorio">Directorio</Link>
          <Link href="/centros">Centros aliados</Link>
          <Link href="/etica">Ética</Link>
          <Link href="/lider">Liderazgo</Link>
        </div>
        <p>
          © 2026 FGDLL
          <br />
          Información institucional.
        </p>
      </div>
    </footer>
  );
}
