// src/app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { z } from "zod";

type RouteParams = { params: { id: string } };

// Helpers de sesión (mantengo tu lógica)
async function getSessionSafe() {
  try {
    return (await getServerSession()) as any;
  } catch {
    return null;
  }
}

function isAdmin(session: any) {
  const role =
    session?.user?.role ||
    session?.user?.role?.name ||
    (session?.user as any)?.roleId;
  return role === "ADMIN";
}

function isCT(session: any) {
  const role =
    session?.user?.role ||
    session?.user?.role?.name ||
    (session?.user as any)?.roleId;
  return role === "CT";
}

// Validación de payload
const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  // aceptamos ISO string y lo convertimos a Date
  date: z.string().datetime().optional(),
  // players se elimina por ahora (no existe relación aún)
  // playerIds: z.array(z.string()).optional(),
});

// Select unificado para devolver siempre la misma forma
const sessionSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  // en tu schema actual el campo es 'createdBy' (string)
  createdBy: true,
  // relación correcta con User se llama 'user'
  user: { select: { id: true, name: true, email: true, role: true } },
} as const;

// GET /api/sessions/[id] -> detalle
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionSafe();
    if (!session?.user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    const item = await prisma.session.findUnique({
      where: { id },
      select: sessionSelect,
    });

    if (!item)
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );

    // mantenemos estructura { data: ... } como en tu versión vieja
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
    if (!session?.user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    // Validar que exista y quién la creó
    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, createdBy: true }, // createdBy = string (userId)
    });
    if (!existing)
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );

    const currentEmail: string | undefined = (session.user as any).email;
    if (!currentEmail)
      return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });

    const current = await prisma.user.findUnique({
      where: { email: currentEmail },
      select: { id: true, role: true },
    });
    if (!current)
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );

    const canEdit =
      isAdmin(session) || (isCT(session) && current.id === existing.createdBy);
    if (!canEdit)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, date } = parsed.data;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = new Date(date);

    const updated = await prisma.session.update({
      where: { id },
      data,
      select: sessionSelect,
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
    if (!session?.user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = params;

    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, createdBy: true },
    });
    if (!existing)
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );

    const currentEmail: string | undefined = (session.user as any).email;
    if (!currentEmail)
      return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });

    const current = await prisma.user.findUnique({
      where: { email: currentEmail },
      select: { id: true, role: true },
    });
    if (!current)
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );

    const canDelete =
      isAdmin(session) || (isCT(session) && current.id === existing.createdBy);
    if (!canDelete)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
