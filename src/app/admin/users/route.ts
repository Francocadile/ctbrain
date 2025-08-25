import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// Listar usuarios
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

// Crear usuario
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, role, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }

    const hashed = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: hashed,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("POST /api/admin/users", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
