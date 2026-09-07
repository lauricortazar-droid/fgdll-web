import { ProtectedAccess } from "../../protected-access";
import { OrientationAdminDashboard } from "./orientation-admin-dashboard";

export const dynamic = "force-dynamic";

export default function OrientationAdministrationPage() {
  return (
    <ProtectedAccess
      returnTo="/administracion/orientacion"
      allowedRoles={["admin"]}
    >
      <OrientationAdminDashboard />
    </ProtectedAccess>
  );
}
