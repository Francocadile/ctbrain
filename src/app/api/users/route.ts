// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

// Helper interno (NO exportar)
function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`; // formato: salt:hash (hex)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const roleInput = String(body?.role || "");

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
    }

    const passwordHashed = hashPassword(password);

    // Público: por ahora permitimos solo crear jugadores (o el rol que venga si ya lo manejás desde Admin).
    const allowedRoles = new Set<Role>([
      Role.JUGADOR,
      Role.CT,
      Role.MEDICO,
      Role.DIRECTIVO,
      Role.ADMIN,
    ]);
    const assignedRole = (allowedRoles.has(roleInput as Role) ? (roleInput as Role) : Role.JUGADOR);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHashed,
        role: assignedRole,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users error", err);
    return NextResponse.json({ error: "Error creando usuario" }, { status: 500 });
  }
}
