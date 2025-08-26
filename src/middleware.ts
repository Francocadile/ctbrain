// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_PATHS = {
  ADMIN: "/admin",
  CT: "/ct",
  MEDICO: "/medico",
  JUGADOR: "/jugador",
  DIRECTIVO: "/directivo",
} as const;

function roleToHome(role?: string) {
  if (!role) return "/login";
  switch (role) {
    case "ADMIN":
      return ROLE_PATHS.ADMIN;
    case "CT":
      return ROLE_PATHS.CT;
    case "MEDICO":
      return ROLE_PATHS.MEDICO;
    case "JUGADOR":
      return ROLE_PATHS.JUGADOR;
    case "DIRECTIVO":
      return ROLE_PATHS.DIRECTIVO;
    default:
      return "/login";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon");

  if (isPublic) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as
    | "ADMIN"
    | "CT"
    | "MEDICO"
    | "JUGADOR"
    | "DIRECTIVO"
    | undefined;

  // Si no hay token → a /login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Protección por carpeta/rol
  const needsRole = (
    [
      "/admin",
      "/ct",
      "/medico",
      "/jugador",
      "/directivo",
    ] as const
  ).find((base) => pathname.startsWith(base));

  if (needsRole) {
    const required =
      needsRole.replace("/", "").toUpperCase() as keyof typeof ROLE_PATHS;

    // Regla simple: solo el rol específico entra a su carpeta.
    if (role !== required) {
      const url = req.nextUrl.clone();
      url.pathname = roleToHome(role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next|static|favicon.ico).*)",
    "/admin/:path*",
    "/ct/:path*",
    "/medico/:path*",
    "/jugador/:path*",
    "/directivo/:path*",
  ],
};
