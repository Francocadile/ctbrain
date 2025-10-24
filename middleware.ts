// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ✅ Solo protegemos rutas del CT (y lo que definas explícito)
const CT_PATHS = [/^\/ct(?:\/|$)/, /^\/api\/sessions(?:\/|$)/];

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;

    // Rutas públicas
    const isPublic =
      pathname.startsWith("/api/auth") ||
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/pending-approval");
    if (isPublic) return NextResponse.next();

    // Bypass SUPERADMIN (inyectado por withAuth)
    // @ts-ignore
    const role = (req as any).nextauth?.token?.role;
    if (role === "SUPERADMIN") return NextResponse.next();

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

    const isAdminOrCT = role === "CT" || role === "ADMIN";
    if (!isAdminOrCT) {
      const url = req.nextUrl.clone();
      url.pathname =
        role === "MEDICO"
          ? "/medico"
          : role === "JUGADOR"
          ? "/player"
          : role === "DIRECTIVO"
          ? "/directivo"
          : "/";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const isPublic =
          pathname.startsWith("/api/auth") ||
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/pending-approval");
        if (isPublic) return true;
        return !!token;
      },
    },
  }
);

// ✅ Sacamos '/api/users/:path*' del matcher
export const config = {
  matcher: [
    // Incluye API salvo /api/auth**
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
