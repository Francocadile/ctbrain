// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

/**
 * GET /api/users
 * (Opcional) Devuelve lista básica de usuarios para el panel de admin.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json(
      { error: "No se pudo listar usuarios" },
      { status: 500 }
    );
  }
}

// Validación de entrada para crear usuario
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional().nullable(),
  password: z.string().min(6),
  role: z
    .enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"])
    .default("JUGADOR"),
});

/**
 * POST /api/users
 * Crea un usuario con password hasheado en el campo `password`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, password, role } = parsed.data;

    // Hash del password -> se guarda en campo `password`
    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        role: role as Role,
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    // Manejo de email duplicado (código Prisma P2002)
    if (err?.code === "P2002" && err?.meta?.target?.includes("email")) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    console.error("POST /api/users error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}
