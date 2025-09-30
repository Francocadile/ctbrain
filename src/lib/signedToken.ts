// src/lib/signedToken.ts
import crypto from "crypto";

/** base64url helpers */
function b64u(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function b64uJSON(obj: any) {
  return b64u(JSON.stringify(obj));
}
function fromB64u(input: string) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad) input += "=".repeat(4 - pad);
  return Buffer.from(input, "base64").toString("utf8");
}

export function signToken(
  payload: Record<string, any>,
  secret: string,
  expiresInSec: number
) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const body = { ...payload, exp };
  const head = b64uJSON(header);
  const payl = b64uJSON(body);
  const data = `${head}.${payl}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken<T = any>(token: string, secret: string): T {
  const [head, payl, sig] = token.split(".");
  if (!head || !payl || !sig) throw new Error("Invalid token");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${head}.${payl}`)
    .digest("base64url");
  if (expected !== sig) throw new Error("Invalid signature");
  const json = JSON.parse(fromB64u(payl));
  if (typeof json?.exp !== "number" || json.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return json as T;
}
