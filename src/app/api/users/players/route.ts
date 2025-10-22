// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlayerRow = { id: string; name: string | null; email: string | null; role?: string };

function toLabel(r: PlayerRow) {
  return r.name?.trim() || r.email?.trim() || r.id;
}

/**
 * GET /api/users/players
 * Devuelve SOLO usuarios con rol jugador.
 * - 1° intento: Prisma con enum Role.JUGADOR
 * - 2° intento: SQL crudo role IN ('JUGADOR','PLAYER')
 * - 3° intento: SQL crudo tolerante (lower/ilike por si está mal grabado)
 */
export async function GET() {
  try {
    // 1) Prisma (enum)
    const viaEnum = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (viaEnum.length > 0) {
      const data = viaEnum.map((u) => ({ ...u, label: toLabel(u) }));
      return NextResponse.json(data, {
        headers: { "cache-control": "no-store", "x-source": "enum" },
      });
    }

    // 2) SQL crudo (por si quedaron valores antiguos)
    const raw1 = await prisma.$queryRaw<PlayerRow[]>`
      SELECT id, name, email, role
      FROM "User"
      WHERE role IN ('JUGADOR','PLAYER')
      ORDER BY name NULLS FIRST, email NULLS FIRST
    `;
    if (raw1.length > 0) {
      const data = raw1.map((u) => ({ id: u.id, name: u.name, email: u.email, label: toLabel(u) }));
      return NextResponse.json(data, {
        headers: { "cache-control": "no-store", "x-source": "raw-fixed" },
      });
    }

    // 3) SQL crudo tolerante (role grabado distinto, espacios, minúsculas, etc.)
    const raw2 = await prisma.$queryRaw<PlayerRow[]>`
      SELECT id, name, email, role
      FROM "User"
      WHERE LOWER(TRIM(role)) LIKE ANY(ARRAY['jugador','player','juga%','%player%'])
      ORDER BY name NULLS FIRST, email NULLS FIRST
    `;
    const data = raw2.map((u) => ({ id: u.id, name: u.name, email: u.email, label: toLabel(u) }));
    return NextResponse.json(data, {
      headers: { "cache-control": "no-store", "x-source": "raw-loose" },
    });
  } catch (err) {
    console.error("GET /api/users/players failed:", err);
    // devolvemos [] para que el front no se rompa
    return new NextResponse(JSON.stringify([]), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-error": "1",
      },
    });
  }
}
