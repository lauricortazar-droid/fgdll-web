import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mensajería FGDLL",
  description: "Acceso privado al asistente de distribución de mensajes de FGDLL.",
};

export default function EnviosShortcutPage() {
  redirect("/administracion/envios");
}

