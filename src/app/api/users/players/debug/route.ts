// src/app/api/users/players/debug/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/players/debug
 * Devuelve conteo por rol y una muestra de 10 usuarios “jugadores”
 * detectados por distintos criterios.
 */
export async function GET() {
  try {
    const counts = await prisma.$queryRaw<
      Array<{ role: string | null; total: number }>
    >`SELECT COALESCE(role,'NULL') AS role, COUNT(*)::int AS total FROM "User" GROUP BY role ORDER BY role`;

    const enumPlayers = await prisma.user.findMany({
      where: { role: { equals: undefined as any } }, // forzamos a ir al raw abajo
      take: 0,
    }).catch(() => []);

    const rawFixed = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null; role: string | null }>
    >`SELECT id, name, email, role FROM "User" WHERE role IN ('JUGADOR','PLAYER') LIMIT 10`;

    const rawLoose = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null; role: string | null }>
    >`SELECT id, name, email, role FROM "User"
      WHERE LOWER(TRIM(role)) LIKE ANY(ARRAY['jugador','player','juga%','%player%'])
      LIMIT 10`;

    return NextResponse.json({
      roleCounts: counts,
      sample: {
        rawFixed,
        rawLoose,
      },
    }, { headers: { "cache-control": "no-store" }});
  } catch (e) {
    console.error("/api/users/players/debug", e);
    return NextResponse.json({ error: "debug_failed" }, { status: 500 });
  }
}
