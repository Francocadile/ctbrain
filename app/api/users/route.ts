// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// POST /api/users  -> alta simple (usado en /login)
// Por defecto: JUGADOR con isApproved = false (pendiente)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const password = (body?.password || "").trim();
    const role: Role = (body?.role as Role) || "JUGADOR";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed, // ahora se guarda hasheada
        role,
        isApproved: false, // queda pendiente hasta aprobación
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
