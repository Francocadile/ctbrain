import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * GET /api/users/players
 * - Devuelve SIEMPRE un array de usuarios [{ id, name, email, role }]
 * - Si no hay JUGADOR, devuelve todos con header "x-fallback-all: 1"
 */
export async function GET() {
  try {
    const onlyPlayers = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (onlyPlayers.length > 0) {
      return NextResponse.json(onlyPlayers);
    }

    // Fallback: no hay jugadores → devolvemos todos para no bloquear la carga
    const everyone = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    return new NextResponse(JSON.stringify(everyone), {
      headers: { "content-type": "application/json", "x-fallback-all": "1" },
    });
  } catch (e) {
    console.error("GET /api/users/players error:", e);
    // Ante error devolvemos array vacío para no romper el cliente
    return NextResponse.json([], { status: 200 });
  }
}
