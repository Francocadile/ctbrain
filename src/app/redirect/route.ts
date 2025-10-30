// src/app/redirect/route.ts   (volvemos al comportamiento original que pegaste)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function roleHome(role?: string) {
  switch (role) {
    case "SUPERADMIN": return "/superadmin";
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

  const role = (session.user as any).role as string;
  const isApproved = (session.user as any).isApproved as boolean | undefined;

  if (role !== "ADMIN" && isApproved === false) {
    return NextResponse.redirect(`${base}/pending-approval`);
  }

  const home = roleHome(role);
  return NextResponse.redirect(`${base}${home}`);
}
