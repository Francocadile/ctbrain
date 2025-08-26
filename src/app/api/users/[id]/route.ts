// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

// Validaciones
const UpdateUserSchema = z.object({
  name: z.string().min(1).optional().nullable(),
  role: z.enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]).optional(),
  password: z.string().min(6).optional(), // si viene, se re-hashea
});

/**
 * GET /api/users/[id]
 * Devuelve un usuario por id.
 */
export async function GET(
  _req: Request,
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
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json(
      { error: "No se pudo obtener el usuario" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Actualiza name/role y opcionalmente password (hash en `password`).
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, role, password } = parsed.data;

    const data: {
      name?: string | null;
      role?: Role;
      password?: string;
    } = {};

    if (typeof name !== "undefined") data.name = name ?? null;
    if (role) data.role = role as Role;
    if (password) data.password = await hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("PATCH /api/users/[id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el usuario" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Elimina un usuario.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("DELETE /api/users/[id] error:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el usuario" },
      { status: 500 }
    );
  }
}
