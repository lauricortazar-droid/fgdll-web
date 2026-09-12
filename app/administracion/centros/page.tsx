import { ProtectedAccess } from "../../protected-access";
import { CenterReviewDashboard } from "./review-dashboard";

export const dynamic = "force-dynamic";

export default function CenterAdministrationPage() {
  return <ProtectedAccess returnTo="/administracion/centros" allowedRoles={["admin"]}><CenterReviewDashboard /></ProtectedAccess>;
}
