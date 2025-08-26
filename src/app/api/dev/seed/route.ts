// src/app/api/dev/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

export async function GET() {
  // Evitamos que corra en producción
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed deshabilitado en producción" },
      { status: 403 }
    );
  }

  try {
    // Usuarios base
    const users: Array<{
      name: string;
      email: string;
      role: Role;
      password: string;
    }> = [
      {
        name: "Super Admin",
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@ctbrain.local",
        role: "ADMIN",
        password: process.env.SEED_ADMIN_PASSWORD ?? "admin123",
      },
      {
        name: "CT Uno",
        email: "ct1@ctbrain.local",
        role: "CT",
        password: "ct123456",
      },
      {
        name: "Médico Uno",
        email: "medico1@ctbrain.local",
        role: "MEDICO",
        password: "medico123",
      },
      {
        name: "Jugador Uno",
        email: "jugador1@ctbrain.local",
        role: "JUGADOR",
        password: "jugador123",
      },
      {
        name: "Directivo Uno",
        email: "directivo1@ctbrain.local",
        role: "DIRECTIVO",
        password: "directivo123",
      },
    ];

    const results = [];

    for (const u of users) {
      const passwordHashed = await hash(u.password, 10);

      const res = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role,
          password: passwordHashed,
        },
        create: {
          name: u.name,
          email: u.email,
          role: u.role,
          password: passwordHashed, // OJO: campo correcto es `password`
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      results.push(res);
    }

    return NextResponse.json({
      ok: true,
      count: results.length,
      users: results,
    });
  } catch (err) {
    console.error("GET /api/dev/seed error:", err);
    return NextResponse.json(
      { error: "No se pudo ejecutar el seed" },
      { status: 500 }
    );
  }
}
