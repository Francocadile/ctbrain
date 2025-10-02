// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rutas públicas (no pedir sesión)
const PUBLIC = [
  /^\/$/,                      // home
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,         // alta pública
  /^\/pending-approval(?:\/|$)/,
  /^\/redirect(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,     // signup público
  /^\/_next\/static(?:\/|$)/,
  /^\/favicon\.ico$/,
];

// Guard CT / API CT
const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  /^\/api\/sessions(?:\/|$)/,
];

// Guard Médico / API Médico (incluye compat /medico)
const MED_PATHS = [
  /^\/med(?:\/|$)/,
  /^\/medico(?:\/|$)/, // compat
  /^\/api\/med(?:\/|$)/,
];

// Guard Admin (nuevo explícito)
const ADMIN_PATHS = [
  /^\/admin(?:\/|$)/,
];

// Excepción: CT puede LEER endpoints clínicos
function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  return /^\/api\/med\/clinical(?:\/|$)/.test(pathname);
}

function matchAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(pathname));
}

function roleHome(role?: string) {
  switch (role) {
    case "ADMIN": return "/admin";
    case "CT": return "/ct";
    case "MEDICO": return "/med";    // ← canónica
    case "JUGADOR": return "/jugador";
    case "DIRECTIVO": return "/directivo";
    default: return "/login";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAPI = pathname.startsWith("/api");

  // Públicos -> dejar pasar
  if (matchAny(pathname, PUBLIC)) {
    return NextResponse.next();
  }

  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);
  const needsADMIN = matchAny(pathname, ADMIN_PATHS);

  // Si no matchea ningún guard -> dejar pasar
  if (!needsCT && !needsMED && !needsADMIN) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isAPI) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role as string | undefined;
  const isApproved = (token as any).isApproved as boolean | undefined;

  // Gate global: si no está aprobado y NO es admin → pending
  if (role !== "ADMIN" && isApproved === false) {
    if (isAPI) {
      return new NextResponse(JSON.stringify({ error: "Forbidden", pendingApproval: true }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

  // Guard ADMIN
  if (needsADMIN) {
    const allowed = role === "ADMIN";
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  // Guard CT
  if (needsCT) {
    const allowed = role === "CT" || role === "ADMIN";
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  // Guard Médico (con excepción de lectura para CT)
  if (needsMED) {
    const allowCTReadOnly = role === "CT" && isClinicalReadForCT(pathname, req.method);
    const allowed = role === "MEDICO" || role === "ADMIN" || allowCTReadOnly;
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ct/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    "/med/:path*",
    "/medico/:path*",   // compat
    "/api/med/:path*",
    "/admin/:path*",    // ← ahora guard explícito
  ],
};
