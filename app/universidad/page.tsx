import type { Metadata } from "next";
import { UniversityPortal } from "./university-portal";

export const metadata: Metadata = {
  title: "Formación FGDLL",
  description: "Inscripciones, actividades, solicitudes y reconocimientos de Formación FGDLL.",
  alternates: { canonical: "https://fgdll.org/universidad" },
};

export default function UniversidadPage() {
  return <UniversityPortal basePath="/universidad" />;
}
