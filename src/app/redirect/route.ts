// src/app/redirect/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;

  if (!session?.user?.role) {
    return NextResponse.redirect(`${base}/login`);
  }

  const home = roleHome(session.user.role as string | undefined);
  return NextResponse.redirect(`${base}${home}`);
}
