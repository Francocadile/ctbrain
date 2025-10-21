
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = ["/", "/login", "/signup", "/api/auth", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // públicos
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role;

  // bypass total para SUPERADMIN
  if (role === "SUPERADMIN") {
    return NextResponse.next();
  }

  // bloquear /admin/superadmin a no-superadmin
  if (pathname.startsWith("/admin/superadmin")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}
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
