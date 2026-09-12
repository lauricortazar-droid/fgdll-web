import { requireChatGPTUser } from "../../chatgpt-auth";
import { SyncedDistributionApp } from "./distribution-sync";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mensajería FGDLL",
  description: "Asistente privado para preparar y distribuir mensajes contacto por contacto mediante WhatsApp.",
};

export default async function EnviosPage() {
  const user = await requireChatGPTUser("/administracion/envios");
  return <SyncedDistributionApp storageNamespace={user.email.toLowerCase()} />;
}

