import { ProtectedAccess } from "../../protected-access";
import { UniversityAdminDashboard } from "./university-admin-dashboard";

export const dynamic = "force-dynamic";
export default function UniversityAdministrationPage() {
  return <ProtectedAccess returnTo="/administracion/universidad" allowedRoles={["admin"]}><UniversityAdminDashboard /></ProtectedAccess>;
}
