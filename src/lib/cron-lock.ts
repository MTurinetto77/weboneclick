/**
 * Lock anti-solapamiento para crons (file lock + stale recovery).
 * Sirve en Passenger/Hostinger con varios workers en la misma máquina.
 */

import { open, unlink, stat } from "fs/promises";
import type { FileHandle } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const DEFAULT_STALE_MS = 5 * 60 * 1000;

export type CronLockHandle = {
  release: () => Promise<void>;
};

function lockPath(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return join(tmpdir(), `oneclick-cron-${safe}.lock`);
}

/**
 * Intenta adquirir el lock. Si ya corre otro proceso (y no está stale),
 * devuelve null. `staleMs` libera locks huérfanos tras un crash.
 */
export async function tryAcquireCronLock(
  name: string,
  options?: { staleMs?: number }
): Promise<CronLockHandle | null> {
  const path = lockPath(name);
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;

  let handle: FileHandle | null = null;
  try {
    handle = await open(path, "wx");
  } catch {
    try {
      const s = await stat(path);
      if (Date.now() - s.mtimeMs <= staleMs) return null;
      await unlink(path).catch(() => undefined);
      handle = await open(path, "wx");
    } catch {
      return null;
    }
  }

  try {
    await handle.writeFile(
      JSON.stringify({
        pid: process.pid,
        at: new Date().toISOString(),
        name,
      }),
      "utf8"
    );
  } catch {
    await handle.close().catch(() => undefined);
    await unlink(path).catch(() => undefined);
    return null;
  }

  let released = false;
  return {
    release: async () => {
      if (released) return;
      released = true;
      await handle!.close().catch(() => undefined);
      await unlink(path).catch(() => undefined);
    },
  };
}

/** Ejecuta `fn` bajo lock; si no pudo adquirir, `acquired: false`. */
export async function withCronLock<T>(
  name: string,
  fn: () => Promise<T>,
  options?: { staleMs?: number }
): Promise<{ acquired: false } | { acquired: true; result: T }> {
  const lock = await tryAcquireCronLock(name, options);
  if (!lock) return { acquired: false };
  try {
    return { acquired: true, result: await fn() };
  } finally {
    await lock.release();
  }
}
