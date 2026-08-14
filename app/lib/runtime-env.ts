export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown[]>;
}

export interface FgdllRuntimeEnv {
  DB: D1DatabaseLike;
  FGDLL_ADMIN_EMAILS?: string;
  FGDLL_LEADER_EMAILS?: string;
  FGDLL_NOTIFICATION_EMAIL?: string;
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
