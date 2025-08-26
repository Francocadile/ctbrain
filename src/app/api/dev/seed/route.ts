import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Si querés poder correrlo en prod, seteá SEED_ENABLE=true en las envs.
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ENABLE !== "true") {
    return NextResponse.json({ ok: false, error: "Seed deshabilitado en producción" }, { status: 403 });
  }

  const plainPassword = process.env.SEED_PASSWORD || "admin123";
  const password = await hash(plainPassword, 10);

  const users: Array<{ email: string; name: string; role: Role }> = [
    { email: "admin@ctbrain.local", name: "Admin", role: "ADMIN" },
    { email: "ct@ctbrain.local", name: "CT", role: "CT" },
    { email: "medico@ctbrain.local", name: "Medico", role: "MEDICO" },
    { email: "jugador@ctbrain.local", name: "Jugador", role: "JUGADOR" },
    { email: "directivo@ctbrain.local", name: "Directivo", role: "DIRECTIVO" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password, // <<<<<<  AHORA ES "password"
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password, // <<<<<<  AHORA ES "password"
      },
    });
  }

  return NextResponse.json({
    ok: true,
    seeded: users.length,
    hint: "Usá estas cuentas en /login con el password de SEED_PASSWORD (default admin123).",
  });
}
