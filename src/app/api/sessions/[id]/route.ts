// src/app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

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
    if (!isDayFlagDescription(data.description)) {
      if (data.title !== undefined) {
        const len = (data.title || "").trim().length;
        // Permitir códigos cortos (1 carácter); sólo bloquear si es vacío
        if (len < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Título muy corto",
            path: ["title"],
          });
        }
      }
    }
  });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });

    const one = await prisma.session.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.SessionWhereInput,
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
    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const issues = parsed.error.issues.map((iss) => ({
        path: iss.path,
        message: iss.message,
      }));
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: flat,
          issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.session.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.SessionWhereInput,
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const updated = await prisma.session.update({
      where: { id: existing.id },
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const existing = await prisma.session.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.SessionWhereInput,
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

  await prisma.session.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/sessions/[id] error:", e);
    return NextResponse.json({ error: "Error al borrar sesión" }, { status: 500 });
  }
}
