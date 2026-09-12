import { ProtectedAccess } from "../protected-access";

export const dynamic = "force-dynamic";

export default function EthicsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/etica">{children}</ProtectedAccess>;
}
