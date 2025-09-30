// src/lib/rateLimit.ts

/**
 * Rate limit "real" via Upstash Redis REST (si envs están configuradas),
 * con fallback local por cookie si no hay Upstash.
 *
 * Necesario para /api/users (signup).
 *
 * Env opcionales para RL global:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** key sugerida: email || ip */
export async function rateLimitUpstash(
  key: string,
  { windowSec = 600, max = 5 }: { windowSec?: number; max?: number } = {}
): Promise<{ allowed: boolean; remaining?: number; retryAfter?: number }> {
  if (!URL || !TOKEN) {
    // Si no hay Upstash configurado, permitir (usaremos fallback por cookie)
    return { allowed: true };
  }

  const k = `rl:signup:${key}`;

  // INCR
  const r1 = await fetch(`${URL}/incr/${encodeURIComponent(k)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  const txt1 = await r1.text();
  const count = Number(txt1);

  // set TTL la primera vez
  if (count === 1) {
    await fetch(`${URL}/expire/${encodeURIComponent(k)}/${windowSec}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
  }

  const allowed = count <= max;
  const remaining = Math.max(0, max - count);

  // Best-effort TTL restante
  let retryAfter: number | undefined;
  try {
    const ttlRes = await fetch(`${URL}/ttl/${encodeURIComponent(k)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    const ttl = Number(await ttlRes.text());
    retryAfter = ttl > 0 ? ttl : undefined;
  } catch {
    // noop
  }

  return { allowed, remaining, retryAfter };
}

// ---------- Fallback local por cookie (cuando no hay Upstash) ----------

export const THROTTLE_COOKIE = "signup_t";
export const THROTTLE_WINDOW_MS = 30_000;

/** Lee una cookie desde el header "cookie" (simple y suficiente para nuestro uso) */
export function readCookie(cookiesHeader: string | null, name: string) {
  if (!cookiesHeader) return null;
  const parts = cookiesHeader.split(/; */);
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === name) return decodeURIComponent(v ?? "");
  }
  return null;
}
