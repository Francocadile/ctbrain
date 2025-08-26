import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Opcional: hacer esta ruta dinámica para evitar caché en Vercel
export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Lista usuarios (sin exponer password)
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
        image: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ ok: false, error: "Error listando usuarios" }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Crea un usuario nuevo. Body JSON:
 * { email: string, name?: string, role?: Role, password: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = (body.email ?? "").toString().trim().toLowerCase();
    const name: string | undefined = body.name ? String(body.name) : undefined;
    const role: Role = (body.role as Role) ?? "JUGADOR";
    const plainPassword = (body.password ?? "").toString();

    if (!email || !plainPassword) {
      return NextResponse.json(
        { ok: false, error: "Email y password son obligatorios" },
        { status: 400 }
      );
    }

    // Hash del password -> se guarda en el campo `password`
    const password = await hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: { email, name, role, password },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/users error:", err);

    // Prisma unique constraint (email repetido)
    if (err?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Ese email ya existe" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Error creando usuario" },
      { status: 500 }
    );
  }
}
