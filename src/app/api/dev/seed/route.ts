// src/app/api/dev/seed/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

// ✅ 4 niveles hacia arriba hasta src/, luego lib/prisma
import prismaSingleton from "../../../../lib/prisma";

const prisma =
  (prismaSingleton as unknown as PrismaClient) || new PrismaClient();

/**
 * Semilla rápida vía GET (solo para entornos de desarrollo).
 * Crea/actualiza 2 usuarios demo con contraseñas hasheadas.
 */
export async function GET() {
  try {
    const seedUsers: Array<{
      name: string;
      email: string;
      role: Role;
      passwordPlain: string;
    }> = [
      {
        name: "Super Admin",
        email: "admin@ctbrain.local",
        role: "ADMIN" as Role,
        passwordPlain: "admin123",
      },
      {
        name: "Jugador Demo",
        email: "jugador@ctbrain.local",
        role: "JUGADOR" as Role,
        passwordPlain: "demo123",
      },
    ];

    for (const u of seedUsers) {
      const password = await hash(u.passwordPlain, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, password },
        create: { email: u.email, name: u.name, role: u.role, password },
      });
    }

    return NextResponse.json({ ok: true, created: seedUsers.length });
  } catch (err) {
    console.error("Seed ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

