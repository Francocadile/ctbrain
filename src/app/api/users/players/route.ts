import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["JUGADOR", "MEDICO", "CT"] } }, // si querés solo JUGADOR, dejá ["JUGADOR"]
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });
  const mapped = users.map(u => ({
    id: u.id,
    label: u.name || u.email,
    sub: u.name ? u.email : "",
  }));
  return NextResponse.json(mapped);
}
