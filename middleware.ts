import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ✅ Solo protegemos rutas del CT (y lo que definas explícito)
const CT_PATHS = [/^\/ct(?:\/|$)/, /^\/api\/sessions(?:\/|$)/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Whitelist explícito para la API de jugadores (la necesitan MÉDICO y CT)
  if (pathname.startsWith("/api/users/players")) {
    return NextResponse.next();
  }

  const needsCT = CT_PATHS.some((r) => r.test(pathname));
  if (!needsCT) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role;
  const isAdminOrCT = role === "CT" || role === "ADMIN";
  if (!isAdminOrCT) {
    const url = req.nextUrl.clone();
    url.pathname =
      role === "MEDICO" ? "/medico" :
      role === "JUGADOR" ? "/player" :
      role === "DIRECTIVO" ? "/directivo" : "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ✅ Sacamos '/api/users/:path*' del matcher
export const config = {
  matcher: [
    "/ct/:path*",
    "/api/sessions/:path*",
    // (no incluimos /api/users)
  ],
};
