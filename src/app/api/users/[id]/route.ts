// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
// ✅ Import RELATIVO (4 niveles hasta src/, luego lib/prisma)
import prismaSingleton from "../../../../lib/prisma";

const prisma =
  (prismaSingleton as unknown as PrismaClient) || new PrismaClient();

/**
 * GET /api/users/[id]  -> devuelve un usuario (sin password)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /users/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id]  -> actualiza name / role / password (opcional)
 * body: { name?: string, role?: Role, password?: string }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const data: Partial<{ name: string; role: Role; password: string }> = {};

    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.role === "string") data.role = body.role as Role;
    if (typeof body.password === "string" && body.password.length > 0) {
      // Nota: acá podrías hashear si quisieras permitir cambio de password en este endpoint
      data.password = body.password;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true, role: true, image: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /users/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id] -> elimina usuario
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /users/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
