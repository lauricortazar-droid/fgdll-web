import { ProtectedAccess } from "../../protected-access";
import { CenterAccessWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default function CenterAccessPage() {
  return <ProtectedAccess returnTo="/centros/acceso" requireProfile={false}><CenterAccessWorkspace /></ProtectedAccess>;
}
