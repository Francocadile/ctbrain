// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "./src/lib/rateLimit";
import { assertCsrf } from "./src/lib/security/csrf";

// ✅ Solo protegemos rutas del CT (y lo que definas explícito)
const CT_PATHS = [/^\/ct(?:\/|$)/, /^\/api\/sessions(?:\/|$)/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ------- Rate limiting básico para login y signup -------
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isSignupRoute = pathname === "/api/users" && req.method === "POST";
  const isAccountPasswordRoute =
    pathname === "/api/account/password" && req.method === "POST";
  const isSuperadminUsersMutateRoute =
    pathname === "/api/superadmin/users" &&
    (req.method === "POST" || req.method === "PUT" || req.method === "DELETE");

  if (isAuthRoute || isSignupRoute || isAccountPasswordRoute || isSuperadminUsersMutateRoute) {
    // Obtener una IP razonable (no perfecta) para clave de rate limit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (req as any).ip ||
      "unknown";

    let keyPrefix: string;
    if (isAuthRoute) {
      keyPrefix = "login";
    } else if (isSignupRoute) {
      keyPrefix = "signup";
    } else if (isAccountPasswordRoute) {
      keyPrefix = "account-password";
    } else {
      keyPrefix = "superadmin-users";
    }
    const key = `${keyPrefix}:ip:${ip}`;

    const { ok } = checkRateLimit({ key, limit: 10, windowMs: 60_000 });

    if (!ok) {
      const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
      return withSecurityHeaders(res);
    }
  }

  const isMutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(
    req.method,
  );

  // CSRF: exigimos header en endpoints sensibles
  if (
    isMutatingMethod &&
    (isSignupRoute || isAccountPasswordRoute || isSuperadminUsersMutateRoute)
  ) {
    try {
      assertCsrf(req);
    } catch (err: any) {
      if (err?.status === 403 && err?.message?.includes("CSRF")) {
        const res = NextResponse.json({ error: "CSRF" }, { status: 403 });
        return withSecurityHeaders(res);
      }
      throw err;
    }
  }

  // ✅ Whitelist explícito para la API de jugadores (la necesitan MÉDICO y CT)
  if (pathname.startsWith("/api/users/players")) {
    const res = NextResponse.next();
    return withSecurityHeaders(res);
  }

  const needsCT = CT_PATHS.some((r) => r.test(pathname));
  if (!needsCT) {
    const res = NextResponse.next();
    return withSecurityHeaders(res);
  }

  const isSessionsApi = pathname.startsWith("/api/sessions");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(url);
    return withSecurityHeaders(res);
  }

  const role = (token as any).role;

  // Para GET /api/sessions permitimos también MEDICO (lectura del microciclo)
  if (isSessionsApi && req.method === "GET") {
    const isAllowed = role === "CT" || role === "ADMIN" || role === "MEDICO";
    if (!isAllowed) {
      const url = req.nextUrl.clone();
      url.pathname =
        role === "JUGADOR" ? "/player" :
        role === "DIRECTIVO" ? "/directivo" : "/";
      const res = NextResponse.redirect(url);
      return withSecurityHeaders(res);
    }

    const res = NextResponse.next();
    return withSecurityHeaders(res);
  }

  const isAdminOrCT = role === "CT" || role === "ADMIN";
  if (!isAdminOrCT) {
    const url = req.nextUrl.clone();
    url.pathname =
      role === "MEDICO" ? "/medico" :
      role === "JUGADOR" ? "/player" :
      role === "DIRECTIVO" ? "/directivo" : "/";
    const res = NextResponse.redirect(url);
    return withSecurityHeaders(res);
  }

  const res = NextResponse.next();
  return withSecurityHeaders(res);
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "0");

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return res;
}

// ✅ Sacamos '/api/users/:path*' del matcher
export const config = {
  matcher: [
    "/ct/:path*",
    "/api/sessions/:path*",
    "/api/auth/:path*",
    "/api/users",
    "/api/account/:path*",
    "/api/superadmin/:path*",
  ],
};
