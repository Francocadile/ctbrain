import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionWithRoles } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { z } from "zod";
import {
  readExercisesFromDescription,
  writeExercisesToDescription,
  type SessionExerciseLink,
} from "@/lib/exercises-serialization";

// Helpers locales (evitamos refactors globales)
async function getUserTeamIdOrNull(userId: string): Promise<string | null> {
  const ut = await prisma.userTeam.findFirst({
    where: { userId },
    select: { teamId: true },
    orderBy: { createdAt: "asc" },
  });
  return ut?.teamId ?? null;
}

const putSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().nonnegative().optional(),
        note: z.string().optional(),
      })
    )
    .max(200), // límite razonable
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSessionWithRoles([Role.CT, Role.ADMIN, Role.MEDICO]);
    const teamId = await getUserTeamIdOrNull(session.user.id);

    // Guard por equipo (si aplica)
    const s = await prisma.session.findFirst({
      where: teamId ? { id: params.id, teamId } : { id: params.id },
      select: { id: true, description: true },
    });
    if (!s) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const items = readExercisesFromDescription(s.description);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/sessions/[id]/exercises error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSessionWithRoles([Role.CT, Role.ADMIN]);
    const teamId = await getUserTeamIdOrNull(session.user.id);

    const s = await prisma.session.findFirst({
      where: teamId ? { id: params.id, teamId } : { id: params.id },
      select: { id: true, description: true },
    });
    if (!s) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // (Opcional) Validación suave: filtrar sólo ejercicios existentes del equipo/usuario
    const ids = parsed.data.items.map((i) => i.id);
    const existing = await prisma.exercise.findMany({
      where: {
        id: { in: ids },
        OR: [
          { teamId: teamId ?? undefined },
          { userId: session.user.id },
        ],
      },
      select: { id: true },
    });
    const validSet = new Set(existing.map((e) => e.id));
    const sanitized: SessionExerciseLink[] = parsed.data.items
      .filter((i) => validSet.has(i.id))
      .map((i, idx) => ({ id: i.id, order: typeof i.order === "number" ? i.order : idx, note: i.note ?? "" }));

    const nextDesc = writeExercisesToDescription(s.description, sanitized);

    await prisma.session.update({
      where: { id: s.id },
      data: { description: nextDesc },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, count: sanitized.length });
  } catch (err) {
    console.error("PUT /api/sessions/[id]/exercises error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
