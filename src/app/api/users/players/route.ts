// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Prisma no funciona en Edge → forzamos Node.js
export const runtime = "nodejs";
// Evitamos ISR/caché para esta API
export const dynamic = "force-dynamic";

/**
 * GET /api/users/players
 * - Devuelve SIEMPRE un array de usuarios [{ id, name, email, role }]
 * - Si no hay JUGADOR, devuelve todos con header "x-fallback-all: 1" (para no bloquear la UI)
 */
export async function GET() {
  try {
    const players = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (players.length > 0) {
      return NextResponse.json(players, {
        headers: { "cache-control": "no-store" },
      });
    }

    // Fallback: no hay JUGADOR → devolvemos todos para que el médico vea algo
    const everyone = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    return new NextResponse(JSON.stringify(everyone), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-fallback-all": "1",
      },
    });
  } catch (err: any) {
    console.error("GET /api/users/players failed:", err);
    // Devolvemos array vacío (no 500) para que el cliente maneje el estado sin romper
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
