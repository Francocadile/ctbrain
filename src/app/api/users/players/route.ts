// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client"; // ✅ usar el enum real

// Evita cacheo en Vercel/Edge
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const players = await prisma.user.findMany({
      where: { role: Role.PLAYER }, // ✅ nada de "PLAYER" como string
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    return NextResponse.json(players);
  } catch (err) {
    console.error("GET /api/users/players error:", err);
    return NextResponse.json({ error: "No se pudo listar jugadores" }, { status: 500 });
  }
}
