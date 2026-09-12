import { ProtectedAccess } from "../../protected-access";

export const dynamic = "force-dynamic";

export default function DirectoryManagementLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/directorio/gestion">{children}</ProtectedAccess>;
}
