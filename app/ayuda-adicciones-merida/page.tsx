import type { Metadata } from "next";
import { SubFooter, SubHeader } from "../section-shell";
import { OrientationClient } from "./orientation-client";

export const metadata: Metadata = {
  title: "Ayuda para adicciones en Mérida | Orientación FGDLL",
  description:
    "Orientación humana para familias que buscan ayuda, grupos o centros de rehabilitación en Mérida y Yucatán. FGDLL no es un centro residencial.",
  alternates: { canonical: "/ayuda-adicciones-merida" },
};

const faq = [
  [
    "¿Guerreros de la Luz es un anexo?",
    "No. FGDLL es una fraternidad de grupos de ayuda y una red de orientación. No presta directamente servicios residenciales, médicos ni de desintoxicación.",
  ],
  [
    "¿Ustedes realizan internamientos?",
    "No. Cuando una familia considera atención residencial, FGDLL puede compartir opciones de centros con los que mantiene relación de trabajo. Cada centro realiza su valoración y decide la admisión.",
  ],
  [
    "¿Qué hago si mi familiar no quiere recibir ayuda?",
    "Busca orientación para ti y tu familia, prioriza la seguridad y evita discutir durante una intoxicación o una situación violenta. Una valoración profesional puede ayudarte a decidir los siguientes pasos.",
  ],
  [
    "¿Cómo sé si necesita atención residencial?",
    "No se determina desde esta página. Debe valorarse la situación individual, los riesgos, la red de apoyo y las necesidades médicas o de salud mental con profesionales competentes.",
  ],
  [
    "¿Cuánto cuesta un centro?",
    "Los costos, requisitos y condiciones se consultan directamente con cada centro. FGDLL no fija sus precios.",
  ],
  [
    "¿Atienden a mujeres o menores de edad?",
    "La población atendida cambia entre centros. La ficha debe indicarlo cuando esté confirmado; de lo contrario aparecerá como información por confirmar.",
  ],
  [
    "¿Puedo acudir primero a un grupo?",
    "Sí. Un grupo puede ser un primer espacio de escucha y orientación comunitaria. No sustituye atención médica, psicológica o psiquiátrica cuando se necesita.",
  ],
  [
    "¿Cómo verifican la información de los centros?",
    "La administración revisa las fichas y registra su fecha de verificación. Los servicios, disponibilidad y condiciones deben confirmarse directamente con el centro.",
  ],
  [
    "¿Qué hago si existe riesgo de sobredosis, violencia o suicidio?",
    "Ante peligro inmediato llama al 911. Para orientación nacional en salud mental y adicciones puedes llamar a Línea de la Vida al 800 911 2000.",
  ],
];

export default function AddictionHelpPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Fraternidad Guerreros de la Luz A.C.",
        url: "https://fgdll.org",
        description:
          "Fraternidad de grupos de ayuda y red de orientación comunitaria.",
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
  return (
    <>
      <SubHeader label="Ayuda para adicciones en Mérida" />
      <OrientationClient faq={faq} />
      <SubFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
