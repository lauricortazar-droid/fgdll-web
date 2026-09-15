import type { Metadata } from "next";
import { SubFooter, SubHeader } from "../section-shell";

export const metadata: Metadata = {
  title: "Consejería en Adicciones | FGDLL",
  description: "Canal público para solicitar orientación y consejería en adicciones.",
  alternates: { canonical: "/consejero" },
};

export default function ConsejeroPage() {
  return <><SubHeader label="Consejería en Adicciones" /><main className="public-ally-page"><section className="subhero"><div className="shell subhero-grid"><div><span className="eyebrow light">Consejería</span><h1>Orientación para decidir el siguiente paso.</h1><p>Acompañamiento inicial para familias, grupos y personas que necesitan ordenar la situación antes de elegir un grupo, centro aliado o apoyo profesional.</p><div className="hero-actions"><a className="button button-gold" href="https://wa.me/529995481194?text=Hola%2C%20necesito%20consejer%C3%ADa%20en%20adicciones" target="_blank" rel="noreferrer">Escribir al WhatsApp</a><a className="button button-ghost" href="tel:+529995481194">Llamar por teléfono</a></div></div><aside><img src="/logo-gdll.png" alt="Escudo de Guerreros de la Luz" /></aside></div></section></main><SubFooter /></>;
}
