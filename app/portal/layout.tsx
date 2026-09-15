import { ProtectedAccess } from "../protected-access";

export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/lider">{children}</ProtectedAccess>;
}
