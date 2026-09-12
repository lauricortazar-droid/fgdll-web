import type { Metadata } from "next";
import Link from "next/link";
import { ProtectedAccess } from "../protected-access";
import oracleSource from "./oraculo-source.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "El Oráculo · Administración FGDLL",
  robots: { index: false, follow: false },
};

export default function OraclePage() {
  return (
    <ProtectedAccess returnTo="/oraculo" allowedRoles={["admin"]}>
      <main className="oracle-admin-page">
        <header className="oracle-admin-header">
          <div>
            <span>HERRAMIENTA PRIVADA</span>
            <strong>El Oráculo</strong>
          </div>
          <Link href="/administracion">← Volver a Administración</Link>
        </header>
        <iframe
          className="oracle-frame"
          title="El Oráculo · Tarot y Horóscopo"
          srcDoc={oracleSource.html}
          sandbox="allow-scripts allow-modals"
          allow="clipboard-write"
        />
      </main>
    </ProtectedAccess>
  );
}
