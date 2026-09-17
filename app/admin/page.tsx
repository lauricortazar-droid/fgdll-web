import { ProtectedAccess } from "../protected-access";
import { AdministrationDashboard } from "../administracion/administration-dashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <ProtectedAccess returnTo="/admin" allowedRoles={["admin"]}><AdministrationDashboard /></ProtectedAccess>;
}
