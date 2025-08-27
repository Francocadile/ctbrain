import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const CT_PATHS = [/^\/ct(?:\/|$)/, /^\/api\/sessions(?:\/|$)/, /^\/api\/users(?:\/|$)/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Solo vigilamos rutas de CT y nuestras APIs
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
    // Redirige al home del rol del usuario
    const url = req.nextUrl.clone();
    url.pathname =
      role === "MEDICO" ? "/medico" :
      role === "JUGADOR" ? "/player" :
      role === "DIRECTIVO" ? "/directivo" : "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ct/:path*",
    "/api/sessions/:path*",
    "/api/users/:path*",
  ],
};
