import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// PATCH /api/ct/routines/items/[itemId] -> actualizar RoutineItem PRO
export async function PATCH(req: Request, { params }: { params: { itemId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const itemId = params.itemId;

    const existing = await prisma.routineItem.findFirst({
      where: { id: itemId },
      include: {
        routine: true,
      },
    });

    if (!existing || existing.routine.teamId !== team.id) {
      return new NextResponse("item not found", { status: 404 });
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

    if (typeof body?.order === "number") {
      data.order = body.order;
    }

    if (typeof body?.blockId === "string") {
      const bid = body.blockId.trim();
      if (!bid) {
        data.blockId = null;
      } else {
        const block = await prisma.routineBlock.findFirst({
          where: { id: bid, routineId: existing.routine.id },
        });
        if (!block) {
          return NextResponse.json(
            { error: "Bloque inválido para esta rutina" },
            { status: 400 },
          );
        }
        data.blockId = bid;
      }
    }

    if (typeof body?.exerciseName === "string") {
      const v = body.exerciseName.trim();
      data.exerciseName = v || null;
    }

    if (typeof body?.exerciseId === "string") {
      const v = body.exerciseId.trim();
      data.exerciseId = v || null;
    }

    if (typeof body?.sets === "number" || body?.sets === null) {
      data.sets = body.sets;
    }

    if (typeof body?.reps === "number" || body?.reps === null) {
      data.reps = body.reps;
    }

    if (typeof body?.load === "string") {
      const v = body.load.trim();
      data.load = v || null;
    }

    if (typeof body?.tempo === "string") {
      const v = body.tempo.trim();
      data.tempo = v || null;
    }

    if (typeof body?.rest === "string") {
      const v = body.rest.trim();
      data.rest = v || null;
    }

    if (typeof body?.notes === "string") {
      const v = body.notes.trim();
      data.notes = v || null;
    }

    if (typeof body?.athleteNotes === "string") {
      const v = body.athleteNotes.trim();
      data.athleteNotes = v || null;
    }

    if (typeof body?.videoUrl === "string") {
      const v = body.videoUrl.trim();
      data.videoUrl = v || null;
    }

    const updated = await prisma.routineItem.update({
      where: { id: existing.id },
      data,
    });

    const resp = {
      id: updated.id,
      routineId: updated.routineId,
      blockId: updated.blockId ?? null,
      title: updated.title,
      description: updated.description ?? null,
      order: updated.order,
      exerciseName: updated.exerciseName ?? null,
      exerciseId: updated.exerciseId ?? null,
      sets: updated.sets ?? null,
      reps: updated.reps ?? null,
      load: updated.load ?? null,
      tempo: updated.tempo ?? null,
      rest: updated.rest ?? null,
      notes: updated.notes ?? null,
      athleteNotes: updated.athleteNotes ?? null,
      videoUrl: updated.videoUrl ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({ data: resp });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine item update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routines/items/[itemId] -> borrar RoutineItem
export async function DELETE(req: Request, { params }: { params: { itemId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const itemId = params.itemId;

    const existing = await prisma.routineItem.findFirst({
      where: { id: itemId },
      include: {
        routine: true,
      },
    });

    if (!existing || existing.routine.teamId !== team.id) {
      return new NextResponse("item not found", { status: 404 });
    }

    await prisma.routineItem.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine item delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
