import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Universidad FGDLL",
  description: "Inscripciones, actividades, solicitudes y reconocimientos de Universidad FGDLL.",
  alternates: { canonical: "https://fgdll.org/universidad" },
};

export default function UniversidadPage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#071f45" }}>
      <iframe
        src="https://universidad.fgdll.org"
        title="Universidad FGDLL"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "#ffffff" }}
      />
      <noscript>
        <p style={{ margin: 0, padding: "2rem", color: "white", fontFamily: "sans-serif" }}>
          Para entrar a Universidad FGDLL, abre{" "}
          <a href="https://universidad.fgdll.org" style={{ color: "#e4b52c" }}>
            el sistema universitario
          </a>.
        </p>
      </noscript>
    </main>
  );
}
