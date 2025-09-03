// src/app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth, requireSessionWithRoles } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

const DAYFLAG_RE = /^\[DAYFLAG:(morning|afternoon)\]/i;
function isDayFlagDescription(desc?: string | null) {
  const t = (desc || "").trim();
  return !!t && DAYFLAG_RE.test(t);
}

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

const updateSchema = z
  .object({
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    date: z.string().datetime().optional(),
    type: z.enum(["GENERAL", "FUERZA", "TACTICA", "AEROBICO", "RECUPERACION"]).optional(),
  })
  .superRefine((data, ctx) => {
    // Si NO es un DAYFLAG, y viene 'title', validamos longitud >= 2
    if (!isDayFlagDescription(data.description)) {
      if (data.title !== undefined) {
        const len = (data.title || "").trim().length;
        if (len > 0 && len < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Título muy corto",
            path: ["title"],
          });
        }
      }
    }
  });

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const one = await prisma.session.findUnique({
      where: { id: params.id },
      select: sessionSelect,
    });
    if (!one) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    return NextResponse.json({ data: one });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("GET /api/sessions/[id] error:", e);
    return NextResponse.json({ error: "Error al obtener sesión" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSessionWithRoles([Role.CT, Role.ADMIN]);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.session.update({
      where: { id: params.id },
      data: {
        ...(data.title !== undefined ? { title: (data.title ?? "").trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.date ? { date: new Date(data.date) } : {}),
        ...(data.type ? { type: data.type } : {}),
      },
      select: sessionSelect,
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("PUT /api/sessions/[id] error:", e);
    return NextResponse.json({ error: "Error al actualizar sesión" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireSessionWithRoles([Role.CT, Role.ADMIN]);
    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/sessions/[id] error:", e);
    return NextResponse.json({ error: "Error al borrar sesión" }, { status: 500 });
  }
}
