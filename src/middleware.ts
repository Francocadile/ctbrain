// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Rutas privadas por rol
const roleRoutes: Record<string, RegExp[]> = {
  ADMIN: [/^\/admin(?:\/|$)/],
  CT: [/^\/ct(?:\/|$)/],
  MEDICO: [/^\/medico(?:\/|$)/],
  JUGADOR: [/^\/jugador(?:\/|$)/],
  DIRECTIVO: [/^\/directivo(?:\/|$)/],
};

export default withAuth(
  function middleware(req) {
    const { nextUrl, nextauth } = req as any;
    const token = nextauth?.token as { role?: string } | null;

    // Si no hay token y no estamos en /login, redirigimos a /login
    if (!token) {
      if (!nextUrl.pathname.startsWith("/login")) {
        const url = new URL("/login", nextUrl.origin);
        url.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    const role = token.role || "JUGADOR";

    // Verificación de acceso por rol
    for (const [r, patterns] of Object.entries(roleRoutes)) {
      for (const p of patterns) {
        if (p.test(nextUrl.pathname)) {
          // Si la ruta es de un rol específico y no coincide el rol del token, 403
          if (r !== role) {
            return NextResponse.json(
              { error: "No autorizado" },
              { status: 403 }
            );
          }
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Indica a withAuth que esta request necesita auth si coincide el matcher (abajo)
      authorized: () => true,
    },
  }
);

// Define qué rutas pasan por el middleware
export const config = {
  matcher: [
    // Áreas protegidas por login
    "/admin/:path*",
    "/ct/:path*",
    "/medico/:path*",
    "/jugador/:path*",
    "/directivo/:path*",
  ],
};
