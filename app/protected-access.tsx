import Link from "next/link";
import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";

export async function ProtectedAccess({
  children,
  returnTo,
}: {
  children: React.ReactNode;
  returnTo: string;
}) {
  const user = await requireChatGPTUser(returnTo);

  return (
    <>
      <div className="private-access-bar">
        <div className="shell private-access-inner">
          <span className="private-access-status"><b aria-hidden="true">●</b> Zona privada FGDLL</span>
          <span className="private-access-user">
            <span>Sesión de <strong>{user.displayName}</strong></span>
            <Link href={chatGPTSignOutPath("/")}>Cerrar sesión</Link>
          </span>
        </div>
      </div>
      {children}
    </>
  );
}
