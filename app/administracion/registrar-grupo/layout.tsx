import { ProtectedAccess } from "../../protected-access";

export const dynamic = "force-dynamic";

export default function GroupRegistrationLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/administracion/registrar-grupo">{children}</ProtectedAccess>;
}
