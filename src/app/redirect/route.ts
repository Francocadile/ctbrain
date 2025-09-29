// src/app/redirect/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // Cargamos el usuario para (eventualmente) chequear isApproved
  // Nota: tu schema actual no tiene isApproved; si no existe, tratamos como aprobado (fallback = true).
  let dbUser: any = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
    });
  } catch {
    // En caso de error de DB, no bloqueamos el acceso
  }

  const isApproved =
    dbUser && typeof dbUser.isApproved === "boolean" ? dbUser.isApproved : true;

  if (!isApproved) {
    // Usuario pendiente → pantalla de aprobación
    return NextResponse.redirect(`${base}/pending-approval`);
  }

  // Resolvemos home por rol (priorizamos DB; si no, lo que venga en session)
  const role = (dbUser?.role as string | undefined) ?? (session.user as any)?.role;
  const home = roleHome(role);

  return NextResponse.redirect(`${base}${home}`);
}
