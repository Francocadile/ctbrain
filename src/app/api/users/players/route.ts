import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const players = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (players.length > 0) {
      return NextResponse.json(players);
    }

    // Fallback: no hay usuarios con rol JUGADOR → devolvemos todos para no bloquear la carga
    const everyone = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    return NextResponse.json({ items: everyone, fallbackAll: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error listando jugadores" }, { status: 500 });
  }
}
