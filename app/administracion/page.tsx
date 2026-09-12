import { ProtectedAccess } from "../protected-access";
import { AdministrationDashboard } from "./administration-dashboard";

export default function AdministrationPage() {
  return <ProtectedAccess returnTo="/administracion"><AdministrationDashboard /></ProtectedAccess>;
}
