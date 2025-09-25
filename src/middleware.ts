import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rutas que requieren CT o ADMIN
const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  // heredado de tu setup previo
  /^\/api\/sessions(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,
];

// Rutas que requieren MEDICO o ADMIN (por defecto)
const MED_PATHS = [
  /^\/med(?:\/|$)/,
  /^\/api\/med(?:\/|$)/,
];

// --- excepciones: CT puede LEER (GET) endpoints clínicos ---
function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  // /api/med/clinical y /api/med/clinical/analytics (+ subrutas)
  return /^\/api\/med\/clinical(?:\/|$)/.test(pathname);
}

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
      return "/player";
    case "DIRECTIVO":
      return "/directivo";
    case "ADMIN":
      return "/";
    default:
      return "/";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAPI = pathname.startsWith("/api");

  // ¿Qué guard aplica?
  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);

  if (!needsCT && !needsMED) {
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
    "/med/:path*",
    "/api/med/:path*",
  ],
};
