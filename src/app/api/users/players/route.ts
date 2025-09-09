import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const players = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });
    return NextResponse.json(players);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error listando jugadores" }, { status: 500 });
  }
}
