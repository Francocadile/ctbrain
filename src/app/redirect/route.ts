// src/app/redirect/route.ts
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
  const base = `${url.protocol}//${url.host}`;

  // No logueado → login
  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/login`);
  }

  // Aprobación por admin:
  // - Si isApproved es boolean y es false → /pending
  // - Si es undefined (columna aún no creada) → dejar pasar para no romper
  const raw = (session.user as any)?.isApproved;
  const approved = typeof raw === "boolean" ? raw : true;
  if (!approved) {
    return NextResponse.redirect(`${base}/pending`);
  }

  // Enviar al home según rol
  const home = roleHome(session.user.role as string | undefined);
  return NextResponse.redirect(`${base}${home}`);
}
