// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { routeForRole } from "@/lib/roles";

// Prefijos protegidos por rol
const PROTECTED_PREFIXES = ["/admin", "/ct", "/medico", "/jugador", "/directivo"] as const;

function isAllowed(pathname: string, role?: string) {
  const r = (role || "").toUpperCase();
  if (pathname.startsWith("/admin")) return r === "ADMIN";
  if (pathname.startsWith("/ct")) return r === "CT" || r === "ADMIN";
  if (pathname.startsWith("/medico")) return r === "MEDICO" || r === "ADMIN";
  if (pathname.startsWith("/jugador")) return r === "JUGADOR" || r === "ADMIN";
  if (pathname.startsWith("/directivo")) return r === "DIRECTIVO" || r === "ADMIN";
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dejar pasar lo no protegido
  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/sessions");
  if (!needsAuth) return NextResponse.next();

  // Whitelist específica de APIs públicas si las necesitás:
  if (pathname.startsWith("/api/users/players")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any)?.role as string | undefined;

  if (!isAllowed(pathname, role)) {
    const url = req.nextUrl.clone();
    url.pathname = routeForRole(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/ct/:path*",
    "/medico/:path*",
    "/jugador/:path*",
    "/directivo/:path*",
    "/api/sessions/:path*",
  ],
};
