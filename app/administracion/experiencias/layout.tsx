import { ProtectedAccess } from "../../protected-access";

export default function ExperienceAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/administracion/experiencias">{children}</ProtectedAccess>;
}
