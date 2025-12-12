// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "./src/lib/rateLimit";

// ✅ Solo protegemos rutas del CT (y lo que definas explícito)
const CT_PATHS = [/^\/ct(?:\/:|$)/, /^\/api\/sessions(?:\/:|$)/];

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
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
    const csrfHeader =
      req.headers.get("x-ct-csrf") ?? req.headers.get("X-CT-CSRF");

    if (!csrfHeader) {
      return NextResponse.json(
        { error: "CSRF token missing" },
        { status: 403 },
      );
    }
  }

  // ✅ Whitelist explícito para la API de jugadores (la necesitan MÉDICO y CT)
  if (pathname.startsWith("/api/users/players")) {
    return NextResponse.next();
  }

  const needsCT = CT_PATHS.some((r) => r.test(pathname));
  if (!needsCT) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role;
  const isAdminOrCT = role === "CT" || role === "ADMIN";
  if (!isAdminOrCT) {
    const url = req.nextUrl.clone();
    url.pathname =
      role === "MEDICO" ? "/medico" :
      role === "JUGADOR" ? "/player" :
      role === "DIRECTIVO" ? "/directivo" : "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
