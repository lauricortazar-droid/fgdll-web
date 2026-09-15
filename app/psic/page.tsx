import type { Metadata } from "next";
import Link from "next/link";
import { SubFooter, SubHeader } from "../section-shell";

export const metadata: Metadata = {
  title: "Psicología Integral TRASCENDE | FGDLL",
  description: "Recurso aliado de atención psicológica integral vinculado al ecosistema FGDLL.",
  alternates: { canonical: "/psic" },
};

export default function PsicPage() {
  return <><SubHeader label="Psicología Integral TRASCENDE" /><main className="public-ally-page"><section className="subhero"><div className="shell subhero-grid"><div><span className="eyebrow light">TRASCENDE</span><h1>Psicología Integral TRASCENDE.</h1><p>Recurso aliado para atención psicológica integral. Este espacio queda listo para agregar servicios, horarios, ubicación y contactos oficiales desde Administración.</p><div className="hero-actions"><Link className="button button-gold" href="/ayuda-adicciones-merida#orientacion">Solicitar orientación</Link><Link className="button button-ghost" href="/etica">Ver principios de cuidado</Link></div></div><aside><img src="/logo-gdll.png" alt="Escudo de Guerreros de la Luz" /></aside></div></section></main><SubFooter /></>;
}
