import { ProtectedAccess } from "../protected-access";

export const dynamic = "force-dynamic";

export default function UniversidadLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/universidad">{children}</ProtectedAccess>;
}
