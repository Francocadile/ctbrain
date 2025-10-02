// src/lib/signedToken.ts
// Util liviano para firmar/verificar tokens (tipo JWT HS256) sin dependencias extra.
import crypto from "crypto";

function b64urlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function b64urlEncodeStr(str: string) {
  return b64urlEncode(Buffer.from(str, "utf8"));
}
function hmac(input: string, secret: string) {
  const raw = crypto.createHmac("sha256", secret).update(input).digest();
  return b64urlEncode(raw);
}

export type ResetPayload = {
  email: string;
  exp: number; // epoch seconds
};

export function signResetToken(
  payload: Omit<ResetPayload, "exp">,
  opts?: { expiresInSec?: number; secret?: string }
) {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + Math.max(60, opts?.expiresInSec ?? 3600); // min 60s, default 1h
  const body: ResetPayload = { ...payload, exp };

  const secret = opts?.secret || process.env.NEXTAUTH_SECRET || "dev-secret";

  const h = b64urlEncodeStr(JSON.stringify(header));
  const p = b64urlEncodeStr(JSON.stringify(body));
  const sig = hmac(`${h}.${p}`, secret);
  return `${h}.${p}.${sig}`;
}

export function verifyResetToken(
  token: string,
  opts?: { secret?: string }
): ResetPayload {
  const secret = opts?.secret || process.env.NEXTAUTH_SECRET || "dev-secret";
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token inválido");

  const [h, p, s] = parts;
  const expected = hmac(`${h}.${p}`, secret);
  if (s !== expected) throw new Error("Firma inválida");

  const json = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const payload = JSON.parse(json) as ResetPayload;

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) throw new Error("Token expirado");

  if (!payload.email) throw new Error("Token sin email");
  return payload;
}
