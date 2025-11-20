import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routines/[id] -> detalle rutina PRO (cabecera + bloques + items)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const routine = await prisma.routine.findFirst({
      where: { id, teamId: team.id },
      include: {
        blocks: {
          orderBy: { order: "asc" },
        },
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!routine) {
      return new NextResponse("routine not found", { status: 404 });
    }

    const data = {
      id: routine.id,
      title: routine.title,
      description: routine.description ?? null,
      goal: routine.goal ?? null,
      visibility: routine.visibility ?? null,
      notesForAthlete: routine.notesForAthlete ?? null,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
      blocks: routine.blocks.map((b: any) => ({
        id: b.id,
        name: b.name,
        order: b.order,
        description: b.description ?? null,
      })),
      items: routine.items.map((it: any) => ({
        id: it.id,
        routineId: it.routineId,
        blockId: it.blockId ?? null,
        title: it.title,
        description: it.description ?? null,
        order: it.order,
        exerciseName: it.exerciseName ?? null,
        exerciseId: it.exerciseId ?? null,
        sets: it.sets ?? null,
        reps: it.reps ?? null,
        load: it.load ?? null,
        tempo: it.tempo ?? null,
        rest: it.rest ?? null,
        notes: it.notes ?? null,
        athleteNotes: it.athleteNotes ?? null,
        videoUrl: it.videoUrl ?? null,
      })),
    };

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine detail error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// PATCH /api/ct/routines/[id] -> editar cabecera { title, description, goal, visibility, notesForAthlete }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const existing = await prisma.routine.findFirst({
      where: { id, teamId: team.id },
    });
    if (!existing) {
      return new NextResponse("routine not found", { status: 404 });
    }

    const body = await req.json();

    const data: any = {};

    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (!t) return new NextResponse("title requerido", { status: 400 });
      data.title = t;
    }

    if (typeof body?.description === "string") {
      const d = body.description.trim();
      data.description = d || null;
    }

    if (typeof body?.goal === "string") {
      const g = body.goal.trim();
      data.goal = g || null;
    }

    if (typeof body?.notesForAthlete === "string") {
      const n = body.notesForAthlete.trim();
      data.notesForAthlete = n || null;
    }

    if (typeof body?.visibility === "string") {
      if (body.visibility === "STAFF_ONLY" || body.visibility === "PLAYER_VISIBLE") {
        data.visibility = body.visibility;
      } else {
        return new NextResponse("visibility inválida", { status: 400 });
      }
    }

    const updated = await prisma.routine.update({
      where: { id: existing.id },
      data,
    });

    const resp = {
      id: updated.id,
      title: updated.title,
      description: updated.description ?? null,
      goal: updated.goal ?? null,
      visibility: updated.visibility ?? null,
      notesForAthlete: updated.notesForAthlete ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({ data: resp });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routines/[id] -> borrar rutina (items en cascada)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const existing = await prisma.routine.findFirst({
      where: { id, teamId: team.id },
    });
    if (!existing) {
      return new NextResponse("routine not found", { status: 404 });
    }

    await prisma.routine.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
