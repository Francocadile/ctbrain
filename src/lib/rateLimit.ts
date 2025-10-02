// src/lib/rateLimit.ts
/**
 * Rate limit con soporte opcional para Upstash Redis (REST).
 * Si no hay envs configuradas, usa un fallback en memoria (seguro para dev/Vercel, no rompe el build).
 *
 * Uso:
 *   const rl = await rateLimit({ identifier: `signup:${ip}:${email}`, limit: 5, windowSec: 600 });
 *   if (!rl.allowed) { ... return 429 ... }
 */

type RLParams = {
  identifier: string; // clave única (p.ej. "signup:IP:email")
  limit?: number;     // cantidad máxima de requests permitidos en la ventana
  windowSec?: number; // tamaño de ventana en segundos (p.ej. 600 = 10 minutos)
};

type RLResult = {
  allowed: boolean;
  remaining: number;
  reset: number;      // timestamp ms en el que se reinicia la ventana
  limit: number;
  strategy: "upstash" | "memory";
};

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** ===== Fallback en memoria (no compartido entre lambdas; suficiente como red de contención) ===== */
declare global {
  // eslint-disable-next-line no-var
  var __RL_MEMORY__: Map<string, { count: number; reset: number }> | undefined;
}
const memoryStore =
  global.__RL_MEMORY__ ?? new Map<string, { count: number; reset: number }>();
if (process.env.NODE_ENV !== "production") {
  global.__RL_MEMORY__ = memoryStore;
}

function memoryRateLimit(
  identifier: string,
  limit: number,
  windowSec: number
): RLResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);
  if (!entry || now >= entry.reset) {
    const reset = now + windowSec * 1000;
    memoryStore.set(identifier, { count: 1, reset });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      reset,
      limit,
      strategy: "memory",
    };
  }
  entry.count += 1;
  memoryStore.set(identifier, entry);
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.reset,
    limit,
    strategy: "memory",
  };
}

/** ===== Upstash (REST) con bucket por ventana fija =====
 * Evitamos depender de TTL del servidor calculando el bucket con time-slicing.
 * key => rl:{identifier}:{epochWindow}
 */
async function upstashRateLimit(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<RLResult> {
  const nowMs = Date.now();
  const windowMs = windowSec * 1000;
  const epochWindow = Math.floor(nowMs / windowMs);
  const key = `rl:${identifier}:${epochWindow}`;
  const reset = (epochWindow + 1) * windowMs; // fin de la ventana
  const expireSec = Math.ceil((reset - nowMs) / 1000);

  const pipelineBody = [
    ["INCR", key],
    ["EXPIRE", key, String(expireSec), "NX"],
  ];

  let current = 1;
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipelineBody),
    });

    // Formato esperado: { result: [ {result: number}, {result: 1|"OK"} ] } o variantes
    const data = await res.json().catch(() => null as any);
    const first = Array.isArray(data?.result)
      ? data.result[0]
      : data?.result ?? data;
    const val =
      typeof first === "number"
        ? first
        : typeof first?.result === "number"
        ? first.result
        : undefined;

    if (typeof val === "number" && Number.isFinite(val)) {
      current = val;
    }
  } catch {
    // si falla Upstash, degradamos a memoria sin romper
    return memoryRateLimit(identifier, limit, windowSec);
  }

  const allowed = current <= limit;
  const remaining = Math.max(0, limit - current);
  return { allowed, remaining, reset, limit, strategy: "upstash" };
}

/** ===== API pública ===== */
export async function rateLimit({
  identifier,
  limit = 5,
  windowSec = 600,
}: RLParams): Promise<RLResult> {
  if (!identifier) {
    // sin identificador no podemos rate-limitar; devolvemos "permitido"
    const reset = Date.now() + windowSec * 1000;
    return {
      allowed: true,
      remaining: limit,
      reset,
      limit,
      strategy: "memory",
    };
  }

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return upstashRateLimit(identifier, limit, windowSec);
  }
  return memoryRateLimit(identifier, limit, windowSec);
}
