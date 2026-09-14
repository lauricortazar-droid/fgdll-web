import { ProtectedAccess } from "../protected-access";

export default function LiderLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/lider">{children}</ProtectedAccess>;
}
