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

// Guard Directivo
const DIRECTIVO_PATHS = [
  /^\/directivo(?:\/|$)/,
];

// Excepción: CT puede LEER endpoints clínicos
function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  return /^\/api\/medico\/(clinical|protocols)(?:\/|$)/.test(pathname);
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
  const isSessionsApi = pathname.startsWith("/api/sessions");
  const isDayTypesApi = pathname.startsWith("/api/ct/planner/day-types");
  const isDayTypeAssignmentsApi = pathname.startsWith("/api/ct/planner/day-type-assignments");

  const debugEnabled = isSessionsApi;
  let debugRole = "none";
  let debugHasToken = "0";

  const withDebug = (res: NextResponse, branch: string): NextResponse => {
    if (debugEnabled) {
      res.headers.set("x-mw-hit", "1");
      res.headers.set("x-mw-path", pathname);
      res.headers.set("x-mw-method", req.method);
      res.headers.set("x-mw-role", debugRole || "none");
      res.headers.set("x-mw-has-token", debugHasToken);
      res.headers.set("x-mw-branch", branch);
    }
    return res;
  };

  // Públicos -> dejar pasar
  if (matchAny(pathname, PUBLIC)) {
    return withDebug(NextResponse.next(), "public");
  }

  // ¿Qué guard aplica?
  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);
  const needsDirectivo = matchAny(pathname, DIRECTIVO_PATHS);

  // Si no matchea nada, dejar pasar
  if (!needsCT && !needsMED && !needsDirectivo) {
    return withDebug(NextResponse.next(), "no-guard");
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isAPI) {
      return withDebug(
        new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
        isSessionsApi ? "sessions-no-token" : "no-token",
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return withDebug(
      NextResponse.redirect(url),
      isSessionsApi ? "sessions-no-token-redirect" : "no-token-redirect",
    );
  }
  // Bypass global para SUPERADMIN: controla todo sin restricciones de equipo.
  const role = (token as any).role as string | undefined;
  debugHasToken = "1";
  debugRole = role ?? "none";
  if (role === "SUPERADMIN") {
    return withDebug(NextResponse.next(), "superadmin");
  }

  const isApproved = (token as any).isApproved as boolean | undefined;

  // Gate global: si no está aprobado y NO es admin → pending
  if (role !== "ADMIN" && isApproved === false) {
    if (isAPI) {
      return withDebug(
        new NextResponse(JSON.stringify({ error: "Forbidden", pendingApproval: true }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
        isSessionsApi ? "sessions-pending-approval-api" : "pending-approval-api",
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/pending-approval";
    return withDebug(
      NextResponse.redirect(url),
      isSessionsApi ? "sessions-pending-approval-redirect" : "pending-approval-redirect",
    );
  }

  // Guard CT
  if (needsCT) {
    // Permitir lectura de sesiones a MEDICO: listado, week y detalle (/api/sessions/[id]) SOLO por GET.
    const isSessionsGet = isSessionsApi && req.method === "GET";
    const isDayTypesGet = (isDayTypesApi || isDayTypeAssignmentsApi) && req.method === "GET";
    const allowed =
      role === "CT" ||
      role === "ADMIN" ||
      ((isSessionsGet || isDayTypesGet) && role === "MEDICO");
    if (!allowed) {
      console.info("[middleware] deny", {
        reason: "role-mismatch",
        pathname,
        guard: "CT",
        role,
        userId: token.sub,
      });
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return withDebug(
        NextResponse.redirect(url),
        isSessionsGet ? "sessions-get-denied" : "ct-denied",
      );
    }
  }

  // Guard Médico (con excepción de lectura para CT)
  if (needsMED) {
    const allowCTReadOnly = role === "CT" && isClinicalReadForCT(pathname, req.method);
    const allowed = role === "MEDICO" || role === "ADMIN" || allowCTReadOnly;
    if (!allowed) {
      console.info("[middleware] deny", {
        reason: "role-mismatch",
        pathname,
        guard: "MEDICO",
        role,
        userId: token.sub,
      });
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return withDebug(NextResponse.redirect(url), "med-denied");
    }
  }

  // Guard Directivo
  if (needsDirectivo) {
    const allowed = role === "DIRECTIVO" || role === "ADMIN" || role === "CT";
    if (!allowed) {
      console.info("[middleware] deny", {
        reason: "role-mismatch",
        pathname,
        guard: "DIRECTIVO",
        role,
        userId: token.sub,
      });
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return withDebug(NextResponse.redirect(url), "directivo-denied");
    }
  }

  const requiresTeam = needsCT || needsMED || needsDirectivo;
  if (requiresTeam) {
    const cookieTeam = req.cookies.get("ctb_team")?.value?.trim();
    const tokenTeam =
      typeof (token as any).currentTeamId === "string"
        ? ((token as any).currentTeamId as string)
        : undefined;
    const teamId = (cookieTeam || tokenTeam || "").trim();

    if (!teamId) {
      console.info("[middleware] deny", {
        reason: "missing-team",
        pathname,
        role,
        requiresTeam,
        userId: token.sub,
      });
      if (isAPI) {
        return withDebug(
          new NextResponse(JSON.stringify({ error: "Team selection required" }), {
            status: 428,
            headers: { "content-type": "application/json" },
          }),
          isSessionsApi ? "sessions-team-required-api" : "team-required-api",
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/redirect";
      url.searchParams.set("team", "select");
      return withDebug(
        NextResponse.redirect(url),
        isSessionsApi ? "sessions-team-required-redirect" : "team-required-redirect",
      );
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-team", teamId);

    return withDebug(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      isSessionsApi && req.method === "GET"
        ? "sessions-get-allowed"
        : "guard-allowed",
    );
  }

  return withDebug(NextResponse.next(), "no-guard-allowed");
}

export const config = {
  matcher: [
    // Home y login quedan públicos; protegemos resto
    "/ct/:path*",
    "/directivo/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    // "/api/users/:path*" ← lo sacamos del matcher, así ni pasa por el middleware
    "/medico/:path*",
    "/api/medico/:path*",
    "/admin/:path*",
  ],
};
