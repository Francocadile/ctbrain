// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Mantener sincronizado con tu modelo Prisma
type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  CT: "/ct",
  MEDICO: "/medico",
  JUGADOR: "/jugador",
  DIRECTIVO: "/directivo",
};

// Rutas protegidas y quién puede entrar
const PROTECTED: Array<{ test: (p: string) => boolean; roles: Role[] }> = [
  { test: (p) => p.startsWith("/admin"), roles: ["ADMIN"] },
  { test: (p) => p.startsWith("/ct"), roles: ["CT", "ADMIN"] },
  { test: (p) => p.startsWith("/medico"), roles: ["MEDICO", "ADMIN"] },
  { test: (p) => p.startsWith("/jugador"), roles: ["JUGADOR", "ADMIN"] },
  { test: (p) => p.startsWith("/directivo"), roles: ["DIRECTIVO", "ADMIN"] },
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const url = req.nextUrl;

  // Obtenemos el token (si está logueado)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token && (token as any).role) as Role | undefined;

  // Si intenta entrar a /login y YA está logueado -> redirigir a su home
  if (pathname === "/login" && role) {
    url.pathname = ROLE_HOME[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Si la ruta está protegida, validar sesión+rol
  const match = PROTECTED.find((r) => r.test(pathname));
  if (match) {
    // No logueado -> mandar a login con "next"
    if (!role) {
      const login = new URL("/login", req.url);
      // incluir la ruta objetivo para volver post-login
      login.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
      return NextResponse.redirect(login);
    }
    // Logueado pero sin permiso -> mandarlo a su home
    if (!match.roles.includes(role)) {
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Limitamos el alcance del middleware para no tocar estáticos, etc.
export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/ct/:path*",
    "/medico/:path*",
    "/jugador/:path*",
    "/directivo/:path*",
  ],
};

