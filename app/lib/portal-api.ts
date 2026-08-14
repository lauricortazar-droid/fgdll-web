import "server-only";

import { getChatGPTUser } from "../chatgpt-auth";
import { getPortalProfile, PortalError } from "./directory-store";

export async function requireApiUser() {
  const user = await getChatGPTUser();
  if (!user) throw new PortalError("Inicia sesión para continuar.", 401);
  return user;
}

export async function requireApiProfile() {
  const user = await requireApiUser();
  const profile = await getPortalProfile(user.email, user.displayName);
  if (!profile) throw new PortalError("Tu perfil todavía no tiene acceso activo.", 403);
  return { user, profile };
}

export function apiError(error: unknown) {
  if (error instanceof PortalError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "No fue posible completar la operación. Inténtalo de nuevo." }, { status: 500 });
}

export async function readJson(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    throw new PortalError("La información enviada no tiene un formato válido.");
  }
}
