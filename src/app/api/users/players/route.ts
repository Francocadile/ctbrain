import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: "asc" }],
  });

  // Si tenés role "PLAYER", filtrá:
  const players = users.filter((u: any) => (u.role ?? "").toUpperCase() === "PLAYER");

  const payload = (players.length ? players : users).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  return NextResponse.json(payload);
}
