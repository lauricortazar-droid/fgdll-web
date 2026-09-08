import type { Metadata } from "next";
import { UniversityPortal } from "./university-portal";

export const metadata: Metadata = {
  title: "Universidad FGDLL",
  description: "Inscripciones, actividades, solicitudes y reconocimientos de Universidad FGDLL.",
  alternates: { canonical: "https://fgdll.org/universidad" },
};

export default function UniversidadPage() {
  return <UniversityPortal />;
}
