// src/app/api/dev/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET() {
  try {
    const seedUsers = [
      {
        name: "Super Admin",
        email: "admin@ctbrain.local",
        role: "ADMIN" as const,
        passwordPlain: "admin123",
      },
      {
        name: "Jugador Demo",
        email: "jugador@ctbrain.local",
        role: "JUGADOR" as const,
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

    return NextResponse.json({ ok: true, createdOrUpdated: seedUsers.length });
  } catch (err: any) {
    console.error("Seed ERROR:", err);
    // devolvemos el mensaje para poder verlo desde el navegador
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
