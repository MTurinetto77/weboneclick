type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate limit en memoria por clave (IP + ruta). Suficiente para un solo proceso Node;
 * en multi-instancia preferir Redis.
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

/** Limpia buckets vencidos periódicamente para no crecer sin límite. */
const CLEAN_EVERY = 500;
let ops = 0;
export function rateLimitClientKey(req: Request, route: string): string {
  if (++ops % CLEAN_EVERY === 0) {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    (forwarded?.split(",")[0] || "").trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${route}:${ip}`;
}
