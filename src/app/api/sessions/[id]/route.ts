// src/app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { z } from "zod";

type RouteParams = { params: { id: string } };

async function getSessionSafe() {
  try {
    return (await getServerSession()) as any;
  } catch {
    return null;
  }
}

function isAdmin(session: any) {
  const role = session?.user?.role || session?.user?.role?.name || (session?.user as any)?.roleId;
  return role === "ADMIN";
}

function isCT(session: any) {
  const role = session?.user?.role || session?.user?.role?.name || (session?.user as any)?.roleId;
  return role === "CT";
}

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  playerIds: z.array(z.string()).optional(), // set completo de jugadores
});

// GET /api/sessions/[id] -> detalle
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionSafe();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    const item = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true, email: true } },
        players: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!item) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("GET /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/sessions/[id] -> editar (CT creador o ADMIN)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    // Validar que exista y quién la creó
    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!existing) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const currentEmail: string | undefined = (session.user as any).email;
    if (!currentEmail) return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });

    const current = await prisma.user.findUnique({
      where: { email: currentEmail },
      select: { id: true, role: true },
    });
    if (!current) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const canEdit = isAdmin(session) || (isCT(session) && current.id === existing.createdById);
    if (!canEdit) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, date, playerIds } = parsed.data;

    const updated = await prisma.session.update({
      where: { id },
      data: {
        title,
        description,
        date,
        ...(Array.isArray(playerIds)
          ? { players: { set: playerIds.map((pid) => ({ id: pid })) } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
        players: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("PUT /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] -> borrar (CT creador o ADMIN)
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!existing) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const currentEmail: string | undefined = (session.user as any).email;
    if (!currentEmail) return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });

    const current = await prisma.user.findUnique({
      where: { email: currentEmail },
      select: { id: true, role: true },
    });
    if (!current) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const canDelete = isAdmin(session) || (isCT(session) && current.id === existing.createdById);
    if (!canDelete) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
