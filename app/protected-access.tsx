import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";
import { getPortalProfile, type PortalRole } from "./lib/directory-store";
import { NotificationCenter } from "./notification-center";

export async function ProtectedAccess({
  children,
  returnTo,
  requireProfile = true,
  allowedRoles,
}: {
  children: React.ReactNode;
  returnTo: string;
  requireProfile?: boolean;
  allowedRoles?: PortalRole[];
}) {
  const user = await requireChatGPTUser(returnTo);
  const profile = requireProfile
    ? await getPortalProfile(user.email, user.displayName)
    : null;

  if (requireProfile && !profile) {
    redirect(`/solicitar-acceso?return_to=${encodeURIComponent(returnTo)}`);
  }
  if (profile && allowedRoles?.length && !allowedRoles.includes(profile.role)) {
    redirect("/lider?access=denied");
  }

  return (
    <>
      <div className="private-access-bar">
        <div className="shell private-access-inner">
          <span className="private-access-status"><b aria-hidden="true">●</b> Zona privada FGDLL{profile ? ` · ${profile.roleLabel}` : ""}</span>
          <NotificationCenter />
          {profile && <a className="messaging-nav-link" href="https://fgdll.org/envios">Mensajería</a>}
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
