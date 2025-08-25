import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_HOME = {
  ADMIN: "/admin",
  CT: "/ct",
  MEDICO: "/medico",
  JUGADOR: "/jugador",
  DIRECTIVO: "/directivo"
} as const;

const PROTECTED_PREFIXES = Object.values(ROLE_HOME);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // permitir estáticos y endpoints públicos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/dev/seed") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as keyof typeof ROLE_HOME | undefined;
  const roleHome = role ? ROLE_HOME[role] : undefined;

  // si entra al login y ya está logueado → redirigir a su panel
  if (pathname === "/login") {
    if (roleHome) return NextResponse.redirect(new URL(roleHome, req.url));
    return NextResponse.next();
  }

  // rutas protegidas por prefijo
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!needsAuth) {
    // raíz: si está logueado, mandarlo a su panel
    if (pathname === "/" && roleHome) {
      return NextResponse.redirect(new URL(roleHome, req.url));
    }
    return NextResponse.next();
  }

  // si no hay sesión o rol válido → login
  if (!token || !roleHome) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // bloquea acceso a paneles de otros roles
  if (!pathname.startsWith(roleHome)) {
    return NextResponse.redirect(new URL(roleHome, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
