import type { Metadata } from "next";
import { UniversityPortal } from "../universidad/university-portal";

export const metadata: Metadata = {
  title: "Formación FGDLL",
  description: "Inscripciones, actividades, solicitudes y reconocimientos de Formación FGDLL.",
  alternates: { canonical: "https://fgdll.org/formacion" },
};

export default function FormacionPage() {
  return <UniversityPortal basePath="/formacion" />;
}
