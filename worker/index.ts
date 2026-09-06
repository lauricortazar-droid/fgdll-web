/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { FgdllRuntimeEnv, installRuntimeEnv } from "../app/lib/runtime-env";

interface Env extends FgdllRuntimeEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const AUTHENTICATED_EMAIL_HEADER = "oai-authenticated-user-email";
const SIGN_IN_ONLY_PREFIXES = ["/solicitar-acceso", "/centros/acceso"];
const ACTIVE_ACCESS_PREFIXES = ["/portal", "/universidad", "/testimonios", "/materiales", "/directorio/gestion", "/administracion"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function configuredEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
}

async function hasActiveAccess(env: Env, email: string) {
  const administrators = configuredEmails(
    env.FGDLL_ADMIN_EMAILS ?? "admin@fgdll.org,jaguarcortazar@gmail.com,laurcortazar@gmail.com,yoltyp@gmail.com",
  );
  if (administrators.has(email) || configuredEmails(env.FGDLL_LEADER_EMAILS).has(email)) return true;

  try {
    const profile = await env.DB.prepare(
      "SELECT active FROM portal_users WHERE email = ? LIMIT 1",
    ).bind(email).first<{ active: number }>();
    return Number(profile?.active ?? 0) === 1;
  } catch (error) {
    console.error("Could not verify portal access", error);
    return false;
  }
}

function accessDeniedResponse(email: string) {
  const safeEmail = email.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);

  return new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso pendiente · FGDLL</title>
<style>body{margin:0;background:#031f46;color:#fff;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:600px;background:#fff;color:#10243f;border-radius:24px;padding:36px;box-shadow:0 24px 80px #00142f}.mark{color:#b77b00;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(30px,7vw,48px);line-height:1.05;margin:14px 0}p{line-height:1.65;color:#536276}.email{background:#f1f4f8;border-radius:12px;padding:13px 16px;font-weight:700;overflow-wrap:anywhere}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}a{display:inline-block;color:#061e41;background:#dca00f;padding:13px 18px;border-radius:999px;text-decoration:none;font-weight:800}.secondary{background:#eef2f7;color:#17385f}</style></head>
<body><main class="card"><span class="mark">Zona privada FGDLL</span><h1>Tu acceso todavía no está autorizado.</h1><p>La sesión se inició correctamente, pero este correo aún no tiene un perfil activo:</p><p class="email">${safeEmail}</p><p>Envía una solicitud para que el Consejo Directivo o la administración revise tu función y alcance.</p><div class="actions"><a href="/solicitar-acceso">Solicitar acceso</a><a class="secondary" href="/">Volver al inicio</a><a class="secondary" href="/signout-with-chatgpt?return_to=%2F">Usar otra cuenta</a></div></main></body></html>`, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    installRuntimeEnv(env);
    const url = new URL(request.url);

    const needsSignIn = matchesPrefix(url.pathname, SIGN_IN_ONLY_PREFIXES) || matchesPrefix(url.pathname, ACTIVE_ACCESS_PREFIXES);
    if (needsSignIn) {
      const email = request.headers.get(AUTHENTICATED_EMAIL_HEADER)?.trim().toLocaleLowerCase();
      if (!email) {
        const returnTo = `${url.pathname}${url.search}`;
        return Response.redirect(new URL(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`, url), 302);
      }
      if (matchesPrefix(url.pathname, ACTIVE_ACCESS_PREFIXES) && !(await hasActiveAccess(env, email))) {
        return accessDeniedResponse(email);
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
