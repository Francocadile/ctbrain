// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rutas que requieren CT o ADMIN
const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  /^\/api\/sessions(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,
];

// Rutas que requieren MEDICO o ADMIN
const MED_PATHS = [
  /^\/med(?:\/|$)/,
  /^\/api\/med(?:\/|$)/,
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
  const isAPI = pathname.startsWith("/api");

  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);

  // Si no cae en guardias, igual controlo aprobación para todo menos rutas públicas
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Si no hay token y la ruta es protegida, voy a login
  if (!token && (needsCT || needsMED)) {
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

  const role = (token as any)?.role as string | undefined;
  const isApproved = (token as any)?.isApproved as boolean | undefined;

  // ✅ Hot-fix: ADMIN nunca va a pending-approval
  if (
    token &&
    role !== "ADMIN" &&
    isApproved === false &&
    !/^\/pending-approval(?:\/|$)/.test(pathname) &&
    !/^\/api\/auth(?:\/|$)/.test(pathname)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

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

  // Guard Médico (CT lectura GET en /api/med/clinical…)
  const allowCTReadOnly =
    role === "CT" &&
    /^\/api\/med\/clinical(?:\/|$)/.test(pathname) &&
    req.method === "GET";

  if (needsMED) {
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
