// src/lib/rateLimit.ts
// Rate limiting muy simple en memoria (por proceso).

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number; // timestamp en ms
};

type Bucket = {
  count: number;
  resetAt: number;
};

// Usamos globalThis para compartir estado entre hot-reloads en dev.
const GLOBAL_KEY = "__ctbrainRateLimitStore";

if (!(GLOBAL_KEY in globalThis)) {
  (globalThis as any)[GLOBAL_KEY] = new Map<string, Bucket>();
}

const store: Map<string, Bucket> = (globalThis as any)[GLOBAL_KEY];

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const { key, limit, windowMs } = params;
  const now = Date.now();

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}
