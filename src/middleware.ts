import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/* ========= Paths protegidos por rol ========= */

// CT o ADMIN
const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  // compat con tu backend actual
  /^\/api\/sessions(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,
];

// MÉDICO o ADMIN (por defecto)
const MED_PATHS = [
  /^\/medico(?:\/|$)/,
  /^\/api\/medico(?:\/|$)/,
];

// ADMIN puro
const ADMIN_PATHS = [
  /^\/admin(?:\/|$)/,
  /^\/api\/admin(?:\/|$)/,
];

/** Excepción: CT puede LEER (GET) endpoints clínicos */
function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  // /api/medico/clinical y /api/medico/clinical/analytics (+ subrutas)
  return /^\/api\/medico\/clinical(?:\/|$)/.test(pathname);
}

function matchAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(pathname));
}

function roleHome(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CT":
      return "/ct";
    case "MEDICO":
      return "/medico";
    case "JUGADOR":
      return "/jugador";   // 👈 ruta jugador en tu app
    case "DIRECTIVO":
      return "/directivo";
    default:
      return "/";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAPI = pathname.startsWith("/api");

  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);
  const needsADMIN = matchAny(pathname, ADMIN_PATHS);

  // Si no requiere guardia, seguir
  if (!needsCT && !needsMED && !needsADMIN) {
    return NextResponse.next();
  }

  // Auth
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

  // Guard CT
  if (needsCT) {
    const allowed = role === "CT" || role === "ADMIN";
    if (!allowed) {
      if (isAPI) {
        return new NextResponse(JSON.stringify({ error: "Forbidden", role }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
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
      if (isAPI) {
        return new NextResponse(JSON.stringify({ error: "Forbidden", role }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  // Guard Admin
  if (needsADMIN) {
    const allowed = role === "ADMIN";
    if (!allowed) {
      if (isAPI) {
        return new NextResponse(JSON.stringify({ error: "Forbidden", role }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // CT
    "/ct/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    "/api/users/:path*",

    // Médico
    "/medico/:path*",
    "/api/medico/:path*",

    // Admin
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
