import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rutas públicas (no pedir sesión)
const PUBLIC = [
  /^\/$/,                      // home
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,         // página de alta pública
  /^\/pending-approval(?:\/|$)/,
  /^\/redirect(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,     // ← API de signup PÚBLICA
  /^\/_next\/static(?:\/|$)/,
  /^\/favicon\.ico$/,
];

// Guard CT / API CT
const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  /^\/api\/sessions(?:\/|$)/,
  // ⚠️ /api/users ya NO va acá (es público)
];

// Guard Médico / API Médico
const MED_PATHS = [
  /^\/medico(?:\/|$)/,
  /^\/api\/medico(?:\/|$)/,
];

// Excepción: CT puede LEER endpoints clínicos
function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  return /^\/api\/medico\/clinical(?:\/|$)/.test(pathname);
}

function matchAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(pathname));
}

function roleHome(role?: string) {
  switch (role) {
    case "ADMIN": return "/admin";
    case "CT": return "/ct";
    case "MEDICO": return "/medico";
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

  // ¿Qué guard aplica?
  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);

  // Si no matchea nada, dejar pasar
  if (!needsCT && !needsMED) {
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
    // Home y login quedan públicos; protegemos resto
    "/ct/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    // "/api/users/:path*" ← lo sacamos del matcher, así ni pasa por el middleware
    "/medico/:path*",
    "/api/medico/:path*",
    "/admin/:path*",
  ],
};
