// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    // Aunque envíen "role", el alta pública siempre crea JUGADOR
    const role: Role = "JUGADOR";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos (name, email, password)" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { name, email, password, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
