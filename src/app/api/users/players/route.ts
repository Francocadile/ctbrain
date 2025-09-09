// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/players
 * Devuelve SOLO usuarios con rol JUGADOR.
 * Fallback: si no hay, intenta role IN ('JUGADOR','PLAYER') vía SQL crudo.
 * Respuesta SIEMPRE con el mismo shape: { id, label, name, email }
 */
export async function GET() {
  try {
    // 1) Camino normal (enum)
    const viaEnum = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (viaEnum.length > 0) {
      const mapped = viaEnum.map((u) => ({
        id: u.id,
        label: u.name || u.email || u.id,
        name: u.name,
        email: u.email,
      }));
      return NextResponse.json(mapped, {
        headers: { "cache-control": "no-store", "x-source": "enum" },
      });
    }

    // 2) Fallback crudo (por si hay registros con 'PLAYER')
    const raw = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null; role: string }>
    >`SELECT id, name, email, role
       FROM "User"
       WHERE role IN ('JUGADOR','PLAYER')
       ORDER BY name NULLS FIRST, email NULLS FIRST`;

    const mappedRaw = raw.map((u) => ({
      id: u.id,
      label: u.name || u.email || u.id,
      name: u.name,
      email: u.email,
    }));

    return NextResponse.json(mappedRaw, {
      headers: { "cache-control": "no-store", "x-source": "raw" },
    });
  } catch (err) {
    console.error("GET /api/users/players failed:", err);
    // devolvemos [] para no romper el front
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
