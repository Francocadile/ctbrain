import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

/**
 * Protege rutas privadas y permite control por rol.
 * Requiere NEXTAUTH_SECRET configurada.
 */
export default withAuth(
  function middleware(req: NextRequest) {
    // Si quisieras forzar roles por ruta, podés leer el token:
    // const role = req.nextauth?.token?.role as string | undefined;
    // const url  = req.nextUrl;

    // Ejemplo de control por rol para /admin (descomentar si querés bloquear por rol):
    // if (url.pathname.startsWith("/admin") && role !== "ADMIN") {
    //   url.pathname = "/"; // o "/login"
    //   return Response.redirect(url);
    // }
  },
  {
    callbacks: {
      /**
       * Se ejecuta ANTES de dejar pasar la request.
       * Si retorna true, permite el acceso.
       * Si retorna false, redirige a /login automáticamente.
       */
      authorized: ({ token }) => {
        // Si hay token => hay sesión
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

/**
 * Indica qué rutas quedan protegidas por el middleware.
 * - /admin y subrutas
 * - /ct, /medico, /jugador, /directivo y sus subrutas
 * Agregá aquí cualquier otra sección privada.
 */
export const config = {
  matcher: [
    "/admin/:path*",
    "/ct/:path*",
    "/medico/:path*",
    "/jugador/:path*",
    "/directivo/:path*",
  ],
};
