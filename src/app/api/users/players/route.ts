import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users/players
export async function GET() {
  const players = await prisma.user.findMany({
    where: { role: "PLAYER" }, // ⚠️ asegura que tu enum sea "PLAYER"
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json(
    players.map((u) => ({
      id: u.id,
      label: u.name || u.email || u.id,
      email: u.email || "",
    }))
  );
}
