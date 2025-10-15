// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";

type RouteParams = { params: { id: string } };

async function getSessionSafe() {
  try {
    return (await getServerSession()) as any;
  } catch {
    return null;
  }
}

function requireAdmin(session: any) {
  const role =
    session?.user?.role || session?.user?.role?.name || (session?.user as any)?.roleId;
  return role === "ADMIN";
}

// GET /api/users/[id]  -> detalle usuario (protegido: ADMIN o el mismo usuario)
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionSafe();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    // Permite ADMIN o el propio usuario
    if (!requireAdmin(session) && session.user.id !== id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        // ⚠️ NO image: tu modelo User no tiene ese campo
      },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]).optional(),
});

// PUT /api/users/[id] -> actualizar (solo ADMIN)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionSafe();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!requireAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, role } = parsed.data;

    const updated = await prisma.user.update({
      where: { id },
      data: { name, email, role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("PUT /api/users/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/users/[id] -> borrar (solo ADMIN)
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionSafe();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!requireAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = params;

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("DELETE /api/users/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
