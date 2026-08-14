import { ProtectedAccess } from "../../protected-access";

export const dynamic = "force-dynamic";

export default function ContentAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/administracion/contenidos">{children}</ProtectedAccess>;
}
