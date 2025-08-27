import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const UserCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "DIRECTIVO", "JUGADOR"]).optional().default("JUGADOR"),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = UserCreateSchema.parse(data);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya existe" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        password: hashed,
        role: parsed.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error("POST /api/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
