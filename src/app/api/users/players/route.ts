// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Prisma necesita Node, y no queremos cache
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/players
 * Devuelve SOLO usuarios con rol JUGADOR.
 * Si por algún motivo el enum no matchea, hace un fallback con SQL crudo
 * buscando role IN ('JUGADOR','PLAYER') para cubrir bases.
 */
export async function GET() {
  try {
    // 1) Camino normal: enum del schema
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

    // 2) Fallback crudo: por si el enum/cliente no coincide,
    // probamos directamente contra la tabla subyacente.
    // Prisma por defecto mapea al modelo "User" -> tabla "User".
    // Cubrimos dos etiquetas posibles: 'JUGADOR' y 'PLAYER'.
    const raw = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null; role: string }>
    >`SELECT id, name, email, role FROM "User" WHERE role IN ('JUGADOR','PLAYER') ORDER BY name NULLS FIRST, email NULLS FIRST`;

    return NextResponse.json(raw, {
      headers: { "cache-control": "no-store", "x-source": "raw-fallback" },
    });
  } catch (err) {
    console.error("GET /api/users/players failed:", err);
    // Devolvemos [] (no 500) para que el cliente no se rompa
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
