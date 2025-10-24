// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * GET /api/users
 * Solo ADMIN o SUPERADMIN pueden listar usuarios.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, teamId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

/**
 * POST /api/users
 * Alta con sanitización + password hasheado (coherente con authorize/bcrypt).
 * Campo role es string (schema actual). Default: "JUGADOR".
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const name = (body?.name ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString().trim();
    const roleInput = (body?.role ?? "").toString().trim().toUpperCase();
    const teamId = body?.teamId ? String(body.teamId) : undefined;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    // Normalizar role (sin enum aún)
    const allowedRoles = new Set(["SUPERADMIN","ADMIN","CT","MEDICO","JUGADOR","DIRECTIVO","USER","user"]);
    const role = allowedRoles.has(roleInput) ? roleInput : "JUGADOR";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        ...(teamId ? { teamId } : {}),
      },
      select: { id: true, email: true, role: true, teamId: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
