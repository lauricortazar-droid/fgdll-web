import type { Metadata } from "next";
import Link from "next/link";
import { SubFooter, SubHeader } from "../section-shell";

export const metadata: Metadata = {
  title: "Instituto Punto Evolutivo | FGDLL",
  description: "Información pública del Instituto Punto Evolutivo como aliado formativo de FGDLL.",
  alternates: { canonical: "/ipe" },
};

export default function IpePage() {
  return <><SubHeader label="Instituto Punto Evolutivo" /><main className="public-ally-page"><section className="subhero"><div className="shell subhero-grid"><div><span className="eyebrow light">IPE</span><h1>Instituto Punto Evolutivo.</h1><p>Espacio aliado para preparatoria, universidad y formación con identidad propia. La formación interna de Guerreros de la Luz vive en Formación FGDLL.</p><div className="hero-actions"><Link className="button button-gold" href="/formacion">Ir a Formación FGDLL</Link><Link className="button button-ghost" href="/ayuda-adicciones-merida#orientacion">Pedir orientación</Link></div></div><aside><img src="/logo-gdll.png" alt="Escudo de Guerreros de la Luz" /></aside></div></section></main><SubFooter /></>;
}
