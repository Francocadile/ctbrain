import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/** Normaliza y valida inputs muy básicos */
function sanitize(str: unknown): string {
  return (typeof str === "string" ? str : "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = sanitize(body.name);
    const email = sanitize(body.email).toLowerCase();
    const password = sanitize(body.password);

    // ⚠️ MVP: forzamos role=JUGADOR sin importar lo que llegue del cliente
    const role: Role = "JUGADOR";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    // ¿ya existe?
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    // ⚠️ MVP: password en texto (tu auth actual no hace hash). Más adelante: hashear.
    const user = await prisma.user.create({
      data: { name, email, password, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err: any) {
    // Prisma unique, etc.
    const msg =
      (typeof err?.message === "string" && err.message) || "Error al crear el usuario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Opcional: bloquear otros métodos */
export async function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}
