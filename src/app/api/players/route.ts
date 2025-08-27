// src/app/api/players/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    // Jugadores solamente
    const players = await prisma.user.findMany({
      where: { role: "JUGADOR" },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 500,
    });
    return NextResponse.json({ data: players });
  } catch (err) {
    console.error("GET /api/players error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
