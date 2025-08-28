// src/app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireAuth, requireSessionWithRoles } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

type RouteParams = { params: { id: string } };

// Validación
const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
  type: z.enum(["GENERAL", "FUERZA", "TACTICA", "AEROBICO", "RECUPERACION"]).optional(),
});

// Select
const sessionSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  user: { select: { id: true, name: true, email: true, role: true } },
} as const;

// GET detalle
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await requireAuth();

    const item = await prisma.session.findUnique({
      where: { id: params.id },
      select: sessionSelect,
    });
    if (!item) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT editar (CT creador o ADMIN)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await requireAuth();

    const existing = await prisma.session.findUnique({
      where: { id: params.id },
      select: { id: true, createdBy: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isCreator = session.user.id === existing.createdBy;

    if (!isAdmin) {
      await requireSessionWithRoles([Role.CT]); // debe ser CT
      if (!isCreator) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, date, type } = parsed.data;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = new Date(date);
    if (type !== undefined) data.type = type;

    const updated = await prisma.session.update({
      where: { id: params.id },
      data,
      select: sessionSelect,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PUT /sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE (CT creador o ADMIN)
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const session = await requireAuth();

    const existing = await prisma.session.findUnique({
      where: { id: params.id },
      select: { id: true, createdBy: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isCreator = session.user.id === existing.createdBy;

    if (!isAdmin) {
      await requireSessionWithRoles([Role.CT]);
      if (!isCreator) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("DELETE /sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
