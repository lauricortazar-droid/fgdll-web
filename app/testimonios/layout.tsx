import { ProtectedAccess } from "../protected-access";

export const dynamic = "force-dynamic";

export default function TestimoniosLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAccess returnTo="/testimonios">{children}</ProtectedAccess>;
}
