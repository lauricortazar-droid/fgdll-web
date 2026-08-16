import { ProtectedAccess } from "../../protected-access";

export const dynamic = "force-dynamic";

export default function ExperienceAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/administracion/experiencias" allowedRoles={["admin"]}>{children}</ProtectedAccess>;
}
