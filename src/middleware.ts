import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  CT: "/ct",
  MEDICO: "/medico",
  JUGADOR: "/jugador",
  DIRECTIVO: "/directivo"
};

const PROTECTED_PREFIXES = ["/admin", "/ct", "/medico", "/jugador", "/directivo"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // permitir estáticos y api auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/dev/seed") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Si está entrando al login y ya está logueado → mandarlo a su home por rol
  if (pathname === "/login" && token?.role && ROLE_HOME[token.role]) {
    return NextResponse.redirect(new URL(ROLE_HOME[token.role], req.url));
  }

  // Rutas protegidas por prefijo
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) {
    // raíz: si está logueado, llévalo a su home por rol
    if (pathname === "/" && token?.role && ROLE_HOME[token.role]) {
      return NextResponse.redirect(new URL(ROLE_HOME[token.role], req.url));
    }
    return NextResponse.next();
  }

  // Si no hay sesión → login
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Verificar acceso por prefijo
  const role: string | undefined = (token as any).role;
  if (!role || !ROLE_HOME[role]) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Si intenta acceder a un prefijo que no es su home, bloqueamos
  if (!pathname.startsWith(ROLE_HOME[role])) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
