import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Universidad FGDLL",
  description: "Inscripciones, actividades, solicitudes y reconocimientos de Universidad FGDLL.",
  alternates: { canonical: "https://universidad.fgdll.org" },
};

export default function UniversidadPage() {
  redirect("https://universidad.fgdll.org");
}
