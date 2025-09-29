import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function roleHome(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CT":
      return "/ct";
    case "MEDICO":
      return "/medico";
    case "JUGADOR":
      return "/jugador";
    case "DIRECTIVO":
      return "/directivo";
    default:
      return "/login";
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);

  // Permite opcionalmente forzar destino con ?to=/alguna/ruta
  const forced = url.searchParams.get("to");

  if (!session?.user) {
    const back = url.searchParams.get("callbackUrl") || "/";
    const redirectTo = `/login?callbackUrl=${encodeURIComponent(back)}`;
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  }

  const role = (session.user as any)?.role as string | undefined;
  const dest = forced || roleHome(role);
  return NextResponse.redirect(new URL(dest, url.origin));
}
