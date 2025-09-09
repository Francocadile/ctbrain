// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/players
 * Devuelve SOLO usuarios con rol JUGADOR.
 * Si el enum no coincide por cualquier motivo, hace un fallback SQL crudo
 * probando role IN ('JUGADOR','PLAYER').
 */
export async function GET() {
  try {
    // Camino normal con enum
    const viaEnum = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });
    if (viaEnum.length > 0) {
      return NextResponse.json(viaEnum, {
        headers: { "cache-control": "no-store", "x-source": "enum" },
      });
    }

    // Fallback crudo (por si la app vieja guardó 'PLAYER')
    const raw = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null; role: string }>
    >`SELECT id, name, email, role
       FROM "User"
       WHERE role IN ('JUGADOR','PLAYER')
       ORDER BY name NULLS FIRST, email NULLS FIRST`;

    return NextResponse.json(raw, {
      headers: { "cache-control": "no-store", "x-source": "raw" },
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
