import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/med/users/players
 * Requiere rol MEDICO (o ADMIN, opcional).
 * Devuelve SOLO usuarios con role=JUGADOR.
 */
export async function GET(req: Request) {
  // --- Auth: solo MEDICO (y opcional ADMIN) ---
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role;
  if (!token || (role !== "MEDICO" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Consulta principal (enum Role.JUGADOR) ---
  const list = await prisma.user.findMany({
    where: { role: Role.JUGADOR },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  // Si por algún motivo en datos viejos hay "PLAYER", probamos fallback crudo.
  if (list.length > 0) {
    return NextResponse.json(list, {
      headers: { "cache-control": "no-store", "x-source": "enum" },
    });
  }

  const raw = await prisma.$queryRaw<
    Array<{ id: string; name: string | null; email: string | null }>
  >`SELECT id, name, email FROM "User"
    WHERE role IN ('JUGADOR','PLAYER')
    ORDER BY name NULLS FIRST, email NULLS FIRST`;

  return NextResponse.json(raw, {
    headers: { "cache-control": "no-store", "x-source": "raw" },
  });
}
