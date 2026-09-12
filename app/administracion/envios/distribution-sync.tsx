"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DistributionApp } from "./distribution-app";

type SyncStatus = "loading" | "synced" | "saving" | "offline" | "conflict";
type CloudWorkspace = {
  state: Record<string, unknown> | null;
  revision: number;
  updatedAt: string | null;
};
type SyncMeta = { revision: number; hash: string; updatedAt: string | null };

const STORAGE_KEY = "fgdll-whatsapp-distributor-v1";
const META_KEY = "fgdll-whatsapp-distributor-sync-v1";

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function readMeta(key: string): SyncMeta | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<SyncMeta>;
    if (typeof parsed.revision !== "number" || typeof parsed.hash !== "string") return null;
    return { revision: parsed.revision, hash: parsed.hash, updatedAt: parsed.updatedAt ?? null };
  } catch {
    return null;
  }
}

export function SyncedDistributionApp({ storageNamespace }: { storageNamespace: string }) {
  const storageKey = useMemo(() => `${STORAGE_KEY}:${storageNamespace}`, [storageNamespace]);
  const metaKey = useMemo(() => `${META_KEY}:${storageNamespace}`, [storageNamespace]);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [booted, setBooted] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);
  const [lastCloudUpdate, setLastCloudUpdate] = useState<string | null>(null);
  const revisionRef = useRef(0);
  const lastSyncedHashRef = useRef("");
  const savingRef = useRef(false);
  const conflictRef = useRef(false);

  const rememberSync = useCallback((revision: number, hash: string, updatedAt: string | null) => {
    revisionRef.current = revision;
    lastSyncedHashRef.current = hash;
    setLastCloudUpdate(updatedAt);
    localStorage.setItem(metaKey, JSON.stringify({ revision, hash, updatedAt } satisfies SyncMeta));
  }, [metaKey]);

  const fetchCloud = useCallback(async (): Promise<CloudWorkspace> => {
    const response = await fetch("/api/distribution", { cache: "no-store" });
    if (!response.ok) throw new Error(`sync-get-${response.status}`);
    return response.json() as Promise<CloudWorkspace>;
  }, []);

  const saveRaw = useCallback(async (raw: string, revision = revisionRef.current, force = false) => {
    if (savingRef.current) return false;
    if (conflictRef.current && !force) return false;
    let state: unknown;
    try {
      state = JSON.parse(raw);
    } catch {
      return false;
    }

    savingRef.current = true;
    setStatus("saving");
    try {
      const response = await fetch("/api/distribution", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state, revision }),
      });
      if (response.status === 409) {
        conflictRef.current = true;
        setStatus("conflict");
        return false;
      }
      if (!response.ok) throw new Error(`sync-put-${response.status}`);
      const cloud = await response.json() as CloudWorkspace;
      rememberSync(cloud.revision, fingerprint(raw), cloud.updatedAt);
      conflictRef.current = false;
      setStatus("synced");
      return true;
    } catch {
      setStatus("offline");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [rememberSync]);

  const applyCloud = useCallback((cloud: CloudWorkspace) => {
    if (!cloud.state) return;
    const raw = JSON.stringify(cloud.state);
    localStorage.setItem(storageKey, raw);
    rememberSync(cloud.revision, fingerprint(raw), cloud.updatedAt);
    conflictRef.current = false;
    setStatus("synced");
    setRenderVersion((version) => version + 1);
  }, [rememberSync, storageKey]);

  useEffect(() => {
    let active = true;
    async function boot() {
      setStatus("loading");
      const localRaw = localStorage.getItem(storageKey);
      const localHash = localRaw ? fingerprint(localRaw) : "";
      const meta = readMeta(metaKey);

      try {
        const cloud = await fetchCloud();
        if (!active) return;

        if (!cloud.state) {
          revisionRef.current = 0;
          lastSyncedHashRef.current = "";
          setBooted(true);
          if (localRaw) await saveRaw(localRaw, 0, true);
          else setStatus("synced");
          return;
        }

        const hasUnsyncedLocal = Boolean(localRaw && meta && localHash !== meta.hash);
        if (hasUnsyncedLocal && meta) {
          revisionRef.current = meta.revision;
          lastSyncedHashRef.current = meta.hash;
          setLastCloudUpdate(meta.updatedAt);
          setBooted(true);
          if (meta.revision === cloud.revision) {
            await saveRaw(localRaw as string, cloud.revision, true);
          } else {
            conflictRef.current = true;
            setStatus("conflict");
          }
          return;
        }

        applyCloud(cloud);
        setBooted(true);
      } catch {
        if (!active) return;
        if (meta) {
          revisionRef.current = meta.revision;
          lastSyncedHashRef.current = meta.hash;
          setLastCloudUpdate(meta.updatedAt);
        }
        setBooted(true);
        setStatus("offline");
      }
    }
    void boot();
    return () => { active = false; };
  }, [applyCloud, fetchCloud, metaKey, saveRaw, storageKey]);

  const refreshFromCloud = useCallback(async () => {
    if (!booted || savingRef.current || conflictRef.current) return;
    const localRaw = localStorage.getItem(storageKey);
    const localHash = localRaw ? fingerprint(localRaw) : "";

    if (localRaw && localHash !== lastSyncedHashRef.current) {
      await saveRaw(localRaw);
      return;
    }

    try {
      const cloud = await fetchCloud();
      if (cloud.state && cloud.revision > revisionRef.current) applyCloud(cloud);
      else if (status === "offline") setStatus("synced");
    } catch {
      setStatus("offline");
    }
  }, [applyCloud, booted, fetchCloud, saveRaw, status, storageKey]);

  useEffect(() => {
    if (!booted) return;
    const saveTimer = window.setInterval(() => {
      if (savingRef.current || conflictRef.current) return;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      if (fingerprint(raw) !== lastSyncedHashRef.current) void saveRaw(raw);
    }, 900);
    const pullTimer = window.setInterval(() => { void refreshFromCloud(); }, 30_000);
    const onFocus = () => { void refreshFromCloud(); };
    const onVisible = () => { if (document.visibilityState === "visible") void refreshFromCloud(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(saveTimer);
      window.clearInterval(pullTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [booted, refreshFromCloud, saveRaw, storageKey]);

  async function useCloudVersion() {
    try {
      const cloud = await fetchCloud();
      if (cloud.state) applyCloud(cloud);
      else {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(metaKey);
        revisionRef.current = 0;
        lastSyncedHashRef.current = "";
        conflictRef.current = false;
        setStatus("synced");
        setRenderVersion((version) => version + 1);
      }
    } catch {
      setStatus("offline");
    }
  }

  async function keepThisDevice() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const cloud = await fetchCloud();
      revisionRef.current = cloud.revision;
      conflictRef.current = false;
      await saveRaw(raw, cloud.revision, true);
    } catch {
      setStatus("offline");
    }
  }

  if (!booted) {
    return <main className="wa-app wa-loading">Sincronizando tu espacio de mensajería…</main>;
  }

  const label = status === "synced" ? "Sincronizado" : status === "saving" ? "Guardando…" : status === "offline" ? "Sin conexión · cambios locales" : status === "conflict" ? "Conflicto entre dispositivos" : "Sincronizando…";

  return <>
    <div className={`wa-cloud-status ${status}`} role="status">
      <span aria-hidden="true">●</span>
      <strong>{label}</strong>
      {lastCloudUpdate && status === "synced" && <small>{new Date(lastCloudUpdate).toLocaleString("es-MX")}</small>}
    </div>
    {status === "conflict" && <div className="wa-sync-conflict" role="alert">
      <strong>Hay cambios distintos en otro dispositivo.</strong>
      <p>Elige cuál versión debe quedar como principal. Ninguna se sobrescribe automáticamente.</p>
      <div><button onClick={() => void useCloudVersion()}>Usar versión de la nube</button><button onClick={() => void keepThisDevice()}>Conservar este dispositivo</button></div>
    </div>}
    <DistributionApp key={renderVersion} storageNamespace={storageNamespace} />
  </>;
}
