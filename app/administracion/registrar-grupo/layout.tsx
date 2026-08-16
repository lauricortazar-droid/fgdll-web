import { ProtectedAccess } from "../../protected-access";

export default function GroupRegistrationLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/administracion/registrar-grupo">{children}</ProtectedAccess>;
}
