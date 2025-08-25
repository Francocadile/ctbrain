import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET() {
  const password = await hash("123456", 10);

  const users = [
    { email: "admin@ctbrain.app", name: "Admin", role: "ADMIN" },
    { email: "ct@ctbrain.app", name: "CT", role: "CT" },
    { email: "medico@ctbrain.app", name: "Médico", role: "MEDICO" },
    { email: "jugador@ctbrain.app", name: "Jugador", role: "JUGADOR" },
    { email: "directivo@ctbrain.app", name: "Directivo", role: "DIRECTIVO" }
  ] as const;

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role as any, passwordHash: password },
      create: { email: u.email, name: u.name, role: u.role as any, passwordHash: password }
    });
  }

  return NextResponse.json({ ok: true, seeded: users.length });
}
