import { ProtectedAccess } from "../../protected-access";
import { EthicsAdminDashboard } from "./ethics-admin-dashboard";

export const dynamic = "force-dynamic";

export default function EthicsAdministrationPage() {
  return <ProtectedAccess returnTo="/administracion/etica" allowedRoles={["admin"]}><EthicsAdminDashboard /></ProtectedAccess>;
}
