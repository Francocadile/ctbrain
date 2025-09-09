// src/app/api/users/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Ajustá el filtro si tenés role "PLAYER". Si no, devolvé todos.
  const users = await prisma.user.findMany({
    // where: { role: "PLAYER" },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }],
  });
  return NextResponse.json(users);
}
