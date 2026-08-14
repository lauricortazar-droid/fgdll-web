/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  FGDLL_LEADER_EMAILS?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const AUTHENTICATED_EMAIL_HEADER = "oai-authenticated-user-email";
const PROTECTED_PREFIXES = ["/portal", "/universidad", "/testimonios", "/materiales"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function allowedEmails(env: Env) {
  return new Set(
    (env.FGDLL_LEADER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
}

function accessDeniedResponse(email: string) {
  const safeEmail = email.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);

  return new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso pendiente · FGDLL</title>
<style>body{margin:0;background:#031f46;color:#fff;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:560px;background:#fff;color:#10243f;border-radius:24px;padding:36px;box-shadow:0 24px 80px #00142f}.mark{color:#b77b00;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(30px,7vw,48px);line-height:1.05;margin:14px 0}p{line-height:1.65;color:#536276}.email{background:#f1f4f8;border-radius:12px;padding:13px 16px;font-weight:700;overflow-wrap:anywhere}a{display:inline-block;margin-top:18px;color:#fff;background:#d49a16;padding:13px 18px;border-radius:999px;text-decoration:none;font-weight:800}.secondary{background:transparent;color:#17385f;margin-left:10px}</style></head>
<body><main class="card"><span class="mark">Zona privada FGDLL</span><h1>Tu acceso todavía no está autorizado.</h1><p>La sesión se inició correctamente, pero este correo aún no aparece en la lista de líderes autorizados:</p><p class="email">${safeEmail}</p><p>Solicita al Consejo Directivo que active tu acceso.</p><a href="/">Volver al inicio</a><a class="secondary" href="/signout-with-chatgpt?return_to=%2F">Usar otra cuenta</a></main></body></html>`, {
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
    const url = new URL(request.url);

    if (isProtectedPath(url.pathname)) {
      const email = request.headers.get(AUTHENTICATED_EMAIL_HEADER)?.trim().toLocaleLowerCase();
      if (!email) {
        const returnTo = `${url.pathname}${url.search}`;
        return Response.redirect(new URL(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`, url), 302);
      }
      if (!allowedEmails(env).has(email)) return accessDeniedResponse(email);
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
