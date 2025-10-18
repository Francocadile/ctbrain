// src/middleware.ts
import { NextResponse as NRes, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * CTB-BASE-12 — Middleware de seguridad por grupos de rutas.
 * - /api/users: público SOLO POST (alta)
 * - /admin: protegido a nivel middleware (no solo RoleGate)
 * - /ct y /medico: guard por rol
 * - Excepción clínica (solo lectura) para CT en /api/medico/clinical/*
 */

const PUBLIC = [
  /^\/$/,                           // home
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,              // alta pública
  /^\/pending-approval(?:\/|$)/,
  /^\/redirect(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,          // ← alta pública (solo POST, ver abajo)
  /^\/_next\/static(?:\/|$)/,
  /^\/favicon\.ico$/,
];

const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  /^\/api\/sessions(?:\/|$)/,
  /^\/api\/planner(?:\/|$)/,
  /^\/api\/exercises-flat(?:\/|$)/,
  /^\/api\/metrics(?:\/|$)/,
  /^\/api\/export(?:\/|$)/,
  /^\/api\/players(?:\/|$)/,
  /^\/api\/search(?:\/|$)/,
];

const MED_PATHS = [
  /^\/medico(?:\/|$)/,
  /^\/api\/medico(?:\/|$)/,
];

const DIRECTIVO_PATHS = [
  /^\/directivo(?:\/|$)/,
  /^\/api\/directivo(?:\/|$)/,
];

const ADMIN_PATHS = [
  /^\/admin(?:\/|$)/,
  /^\/api\/admin(?:\/|$)/,
];

function matchAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(pathname));
}

function isApi(pathname: string) {
  return pathname.startsWith("/api/");
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

function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  return /^\/api\/medico\/clinical(?:\/|$)/.test(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const api = isApi(pathname);

  // Públicos → dejar pasar (con control de método en /api/users)
  if (matchAny(pathname, PUBLIC)) {
    if (/^\/api\/users(?:\/|$)/.test(pathname) && req.method !== "POST") {
      return new NRes(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return NRes.next();
  }

  // ¿Qué guard aplica?
  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);
  const needsDIR = matchAny(pathname, DIRECTIVO_PATHS);
  const needsADM = matchAny(pathname, ADMIN_PATHS);

  // Si no matchea ninguno de los grupos, dejar pasar
  if (!needsCT && !needsMED && !needsDIR && !needsADM) {
    return NRes.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (api) {
      return new NRes(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NRes.redirect(url);
  }

  const role = (token as any).role as string | undefined;
  const isApproved = (token as any).isApproved as boolean | undefined;

  // Gate global: si no está aprobado y NO es admin → pending-approval
  if (role !== "ADMIN" && isApproved === false) {
    if (api) {
      return new NRes(JSON.stringify({ error: "Forbidden", pendingApproval: true }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/pending-approval";
    return NRes.redirect(url);
  }

  // Guards por grupo
  if (needsADM) {
    const allowed = role === "ADMIN" || role === "SUPERADMIN"; // SUPERADMIN futuro
    if (!allowed) {
      if (api) {
        return new NRes(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NRes.redirect(url);
    }
  }

  if (needsCT) {
    const allowed = role === "CT" || role === "ADMIN";
    if (!allowed) {
      if (api) {
        return new NRes(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NRes.redirect(url);
    }
  }

  if (needsMED) {
    const allowCTReadOnly = role === "CT" && isClinicalReadForCT(pathname, req.method);
    const allowed = role === "MEDICO" || role === "ADMIN" || allowCTReadOnly;
    if (!allowed) {
      if (api) {
        return new NRes(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NRes.redirect(url);
    }
  }

  if (needsDIR) {
    const allowed = role === "DIRECTIVO" || role === "ADMIN";
    if (!allowed) {
      if (api) {
        return new NRes(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NRes.redirect(url);
    }
  }

  return NRes.next();
}

export const config = {
  matcher: [
    // Públicos con control de método (api/users)
    "/api/users/:path*",

    // CT
    "/ct/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    "/api/planner/:path*",
    "/api/exercises-flat/:path*",
    "/api/metrics/:path*",
    "/api/export/:path*",
    "/api/players/:path*",
    "/api/search/:path*",

    // MED
    "/medico/:path*",
    "/api/medico/:path*",

    // DIR
    "/directivo/:path*",
    "/api/directivo/:path*",

    // ADMIN
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * CTB-BASE-12 — Middleware de seguridad por grupos de rutas.
 * - /api/users: público SOLO POST (alta)
 * - /admin: protegido a nivel middleware (no solo RoleGate)
 * - /ct y /medico: guard por rol
 * - Excepción clínica (solo lectura) para CT en /api/medico/clinical/*
 */

const PUBLIC = [
  /^\/$/,                           // home
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,              // alta pública
  /^\/pending-approval(?:\/|$)/,
  /^\/redirect(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/users(?:\/|$)/,          // ← alta pública (solo POST, ver abajo)
  /^\/_next\/static(?:\/|$)/,
  /^\/favicon\.ico$/,
];

const CT_PATHS = [
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  /^\/api\/sessions(?:\/|$)/,
  /^\/api\/planner(?:\/|$)/,
  /^\/api\/exercises-flat(?:\/|$)/,
  /^\/api\/metrics(?:\/|$)/,
  /^\/api\/export(?:\/|$)/,
  /^\/api\/players(?:\/|$)/,
  /^\/api\/search(?:\/|$)/,
];

const MED_PATHS = [
  /^\/medico(?:\/|$)/,
  /^\/api\/medico(?:\/|$)/,
];

const DIRECTIVO_PATHS = [
  /^\/directivo(?:\/|$)/,
  /^\/api\/directivo(?:\/|$)/,
];

const ADMIN_PATHS = [
  /^\/admin(?:\/|$)/,
  /^\/api\/admin(?:\/|$)/,
];

function matchAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(pathname));
}

function isApi(pathname: string) {
  return pathname.startsWith("/api/");
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

function isClinicalReadForCT(pathname: string, method: string) {
  if (method !== "GET") return false;
  return /^\/api\/medico\/clinical(?:\/|$)/.test(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const api = isApi(pathname);

  // Públicos → dejar pasar (con excepción de método en /api/users)
  if (matchAny(pathname, PUBLIC)) {
    // /api/users debe aceptar SOLO POST
    if (/^\/api\/users(?:\/|$)/.test(pathname) && req.method !== "POST") {
      return new NextResponse(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.next();
  }

  // ¿Qué guard aplica?
  const needsCT = matchAny(pathname, CT_PATHS);
  const needsMED = matchAny(pathname, MED_PATHS);
  const needsDIR = matchAny(pathname, DIRECTIVO_PATHS);
  const needsADM = matchAny(pathname, ADMIN_PATHS);

  // Si no matchea ninguno de los grupos, dejar pasar
  if (!needsCT && !needsMED && !needsDIR && !needsADM) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (api) {
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

  // Gate global: si no está aprobado y NO es admin → pending-approval
  if (role !== "ADMIN" && isApproved === false) {
    if (api) {
      return new NextResponse(JSON.stringify({ error: "Forbidden", pendingApproval: true }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

  // Guards por grupo
  if (needsADM) {
    const allowed = role === "ADMIN" || role === "SUPERADMIN"; // SUPERADMIN futuro
    if (!allowed) {
      if (api) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  if (needsCT) {
    const allowed = role === "CT" || role === "ADMIN";
    if (!allowed) {
      if (api) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  if (needsMED) {
    const allowCTReadOnly = role === "CT" && isClinicalReadForCT(pathname, req.method);
    const allowed = role === "MEDICO" || role === "ADMIN" || allowCTReadOnly;
    if (!allowed) {
      if (api) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  if (needsDIR) {
    const allowed = role === "DIRECTIVO" || role === "ADMIN";
    if (!allowed) {
      if (api) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
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
    // Públicos con control de método (api/users)
    "/api/users/:path*",

    // CT
    "/ct/:path*",
    "/api/ct/:path*",
    "/api/sessions/:path*",
    "/api/planner/:path*",
    "/api/exercises-flat/:path*",
    "/api/metrics/:path*",
    "/api/export/:path*",
    "/api/players/:path*",
    "/api/search/:path*",

    // MED
    "/medico/:path*",
    "/api/medico/:path*",

    // DIR
    "/directivo/:path*",
    "/api/directivo/:path*",

    // ADMIN
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
import { NextResponse } from "next/server";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
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
    /^\/api\/admin(?:\/|$)/,     // ← API de admin PROTEGIDA
    /^\/admin(?:\/|$)/,
  /^\/ct(?:\/|$)/,
  /^\/api\/ct(?:\/|$)/,
  /^\/api\/sessions(?:\/|$)/,
  // ⚠️ /api/users ya NO va acá (es público)
];

// Guard Médico / API Médico
const MED_PATHS = [
    /^\/api\/admin(?:\/|$)/,
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
    const needsADM = matchAny(pathname, ADMIN_PATHS);
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
    // Guard Admin
    if (needsADM) {
      const allowed = role === "ADMIN" || role === "SUPERADMIN"; // SUPERADMIN futuro
      if (!allowed) {
        const url = req.nextUrl.clone();
        url.pathname = roleHome(role);
        return NextResponse.redirect(url);
      }
    }
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
