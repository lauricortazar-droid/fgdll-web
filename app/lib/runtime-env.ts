export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta: { changes?: number; last_row_id?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown[]>;
}

export interface R2ObjectLike {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag?: string;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string; contentDisposition?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}

export interface FgdllRuntimeEnv {
  DB: D1DatabaseLike;
  BUCKET: R2BucketLike;
  FGDLL_ADMIN_EMAILS?: string;
  FGDLL_LEADER_EMAILS?: string;
  FGDLL_NOTIFICATION_EMAIL?: string;
  RESEND_API_KEY?: string;
  FGDLL_EMAIL_FROM?: string;
}

const runtimeGlobal = globalThis as typeof globalThis & {
  __FGDLL_RUNTIME_ENV__?: FgdllRuntimeEnv;
};

export function installRuntimeEnv(runtimeEnv: FgdllRuntimeEnv) {
  runtimeGlobal.__FGDLL_RUNTIME_ENV__ = runtimeEnv;
}

export function getRuntimeEnv() {
  const runtimeEnv = runtimeGlobal.__FGDLL_RUNTIME_ENV__;
  if (!runtimeEnv) throw new Error("El entorno del portal todavía no está disponible.");
  return runtimeEnv;
}
