import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function assertCsrf(req: NextRequest | Request) {
  const headers: Headers | null =
    (req as any).headers instanceof Headers
      ? (req as any).headers
      : typeof (req as any).headers?.get === "function"
        ? (req as any).headers
        : null;

  const header = headers?.get("X-CT-CSRF") ?? headers?.get("x-ct-csrf") ?? null;

  if (header !== "1" && header !== "ctb") {
    const err = new Error("CSRF token missing or invalid");
    (err as any).status = 403;
    throw err;
  }
}

export function handleCsrfError(err: unknown) {
  if ((err as any)?.status === 403 && (err as any)?.message?.includes("CSRF")) {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }
  return null;
}
