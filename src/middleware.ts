// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Zonas por rol
const CT_PATHS = [/^\/ct(?:\/|$)/, /^\/api\/ct(?:\/|$)/, /^\/api\/sessions(?:\/|$)/, /^\/api\/users(?:\/|$)/];

// Médico -> tu app usa /medico (no /med) para UI
const MED_PATHS = [/^\/medico(?:\/|$)/, /^\/api\/med(?:\/|$)/];

// Otras zonas
const PLAYER_PATHS = [/^\/jugador(?:\/|$)/, /^\/player(?:\/|$)/];
const DIRECTIVO_PATHS = [/^\/directivo(?:\/|$)/];
const ADMIN_PATHS = [/^\/admin(?:\/|$)/];

const PUBLIC_ALLOWLIST = [
  /^\/$/,
  /^\/login(?:\/|$)/,
  /^\/redirect(?:\/|$)/,
  /^\/pending-approval(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/, // next-auth
  /^\/_next(?:\/|$)/,
  /^\/favicon\.ico$/,
  /^\/images(?:\/|$)/,
  /^\/public(?:\/|$)/,
];

function matchAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(pathname));
}

function roleHome(role?: string) {
  switch (role) {
    case "MEDICO":
      return "/medico";
    case "CT":
      return "/ct";
    case "JUGADOR":
      return "/jugador";
    case "DIRECTIVO":
      return "/directivo";
    case "ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (matchAny(pathname, PUBLIC_ALLOWLIST)) return NextResponse.next();

  const protectedZone =
    matchAny(pathname, CT_PATHS) ||
    matchAny(pathname, MED_PATHS) ||
    matchAny(pathname, PLAYER_PATHS) ||
    matchAny(pathname, DIRECTIVO_PATHS) ||
    matchAny(pathname, ADMIN_PATHS);

  if (!protectedZone) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role as string | undefined;
  const isApproved = (token as any).isApproved as boolean | undefined;

  // Gate global: no aprobados → pendiente
  if (isApproved === false && !/^\/pending-approval/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

  // Reglas por zona
  if (matchAny(pathname, CT_PATHS) && !(role === "CT" || role === "ADMIN")) {
    const url = req.nextUrl.clone();
    url.pathname = roleHome(role);
    return NextResponse.redirect(url);
  }
  if (matchAny(pathname, MED_PATHS) && !(role === "MEDICO" || role === "ADMIN")) {
    const url = req.nextUrl.clone();
    url.pathname = roleHome(role);
    return NextResponse.redirect(url);
  }
  if (matchAny(pathname, PLAYER_PATHS) && !(role === "JUGADOR" || role === "ADMIN")) {
    const url = req.nextUrl.clone();
    url.pathname = roleHome(role);
    return NextResponse.redirect(url);
  }
  if (matchAny(pathname, DIRECTIVO_PATHS) && !(role === "DIRECTIVO" || role === "ADMIN")) {
    const url = req.nextUrl.clone();
    url.pathname = roleHome(role);
    return NextResponse.redirect(url);
  }
  if (matchAny(pathname, ADMIN_PATHS) && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = roleHome(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ct/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    "/api/users/:path*",

    "/medico/:path*",
    "/api/med/:path*",

    "/jugador/:path*",
    "/player/:path*",
    "/directivo/:path*",
    "/admin/:path*",
  ],
};
