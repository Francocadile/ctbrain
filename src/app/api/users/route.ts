// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { hash } from "bcryptjs";

// ❗ ruta relativa (sin "@/")
import prismaSingleton from "../../../lib/prisma";

const prisma = (prismaSingleton as unknown as PrismaClient) || new PrismaClient();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role).default("JUGADOR"),
  password: z.string().min(6),
});

// GET /api/users  -> lista simple
export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// POST /api/users -> crear usuario con password hasheado
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createUserSchema.parse(body);

    const passwordHash = await hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        role: parsed.role,
        password: passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error creating user" },
      { status: 400 }
    );
  }
}
