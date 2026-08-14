import { ProtectedAccess } from "../protected-access";

export const dynamic = "force-dynamic";

export default function AccessRequestLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/solicitar-acceso">{children}</ProtectedAccess>;
}
