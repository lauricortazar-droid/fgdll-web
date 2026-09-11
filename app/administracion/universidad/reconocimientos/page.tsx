import { ProtectedAccess } from "../../../protected-access";
import { RecognitionDashboard } from "./recognition-dashboard";

export const dynamic = "force-dynamic";

export default function RecognitionAdministrationPage() {
  return <ProtectedAccess returnTo="/administracion/universidad/reconocimientos" allowedRoles={["admin"]}><RecognitionDashboard /></ProtectedAccess>;
}
