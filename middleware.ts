// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Prefijos protegidos por rol
const PROTECTED_PREFIXES = ["/admin", "/ct", "/medico", "/jugador", "/directivo"] as const;

function homeForRole(role?: string) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "/admin";
  if (r === "CT") return "/ct";
  if (r === "MEDICO") return "/medico";
  if (r === "JUGADOR") return "/jugador";
  if (r === "DIRECTIVO") return "/directivo";
  return "/login";
}

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

  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/sessions");

  if (!needsAuth) return NextResponse.next();

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
    url.pathname = homeForRole(role);
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
