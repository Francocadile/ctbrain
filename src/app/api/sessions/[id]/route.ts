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

import { SessionType } from "@prisma/client";
const updateSchema = z.object({
  // Si viene title: trim y validar non-empty; si no viene, se ignora (optional)
  title: z
    .string()
    .transform((s: string) => (s ?? "").trim())
    .refine((s: string) => s.length > 0, { message: "Título obligatorio" })
    .optional(),
  description: z.string().optional().nullable(),
  date: z.string().optional(), // ISO
  type: z.nativeEnum(SessionType).optional(),
});

function parseISOAsUTC(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  if (iso.endsWith("Z") || iso.toUpperCase().includes("UTC")) return d;
  return new Date(Date.UTC(
    d.getFullYear(), d.getMonth(), d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()
  ));
}

async function getUserTeamIdOrNull(userId: string): Promise<string | null> {
  const ut = await prisma.userTeam.findFirst({
    where: { userId },
    select: { teamId: true },
    orderBy: { createdAt: "asc" },
  });
  return ut?.teamId ?? null;
}

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
    const session = await requireSessionWithRoles([Role.CT, Role.ADMIN]);
    const id = params.id;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const teamId = await getUserTeamIdOrNull(session.user.id);

  const data: any = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;
  if (parsed.data.type !== undefined) data.type = parsed.data.type;
  if (parsed.data.date !== undefined) data.date = parseISOAsUTC(parsed.data.date);

    const updated = await prisma.session.update({
      where: teamId ? { id, teamId } : { id },
      data,
      select: sessionSelect,
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    console.error("PUT /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Error al actualizar la sesión" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSessionWithRoles([Role.CT, Role.ADMIN]);
    const id = params.id;
    const teamId = await getUserTeamIdOrNull(session.user.id);

    await prisma.session.delete({
      where: teamId ? { id, teamId } : { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    console.error("DELETE /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Error al eliminar la sesión" }, { status: 500 });
  }
}
