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