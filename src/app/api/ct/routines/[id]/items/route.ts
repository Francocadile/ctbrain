import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// POST /api/ct/routines/[id]/items -> crear RoutineItem PRO
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const routineId = params.id;

    const routine = await prisma.routine.findFirst({
      where: { id: routineId, teamId: team.id },
    });

    if (!routine) {
      return new NextResponse("routine not found", { status: 404 });
    }

    const body = await req.json();

    const rawTitle = body?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (!title) {
      return new NextResponse("title requerido", { status: 400 });
    }

    const rawDescription = body?.description;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    const order = typeof body?.order === "number" ? body.order : 0;

    const rawBlockId = typeof body?.blockId === "string" ? body.blockId.trim() : "";
    let blockId: string | undefined;
    if (rawBlockId) {
      const block = await prisma.routineBlock.findFirst({
        where: { id: rawBlockId, routineId: routine.id },
      });
      if (!block) {
        return NextResponse.json(
          { error: "Bloque inválido para esta rutina" },
          { status: 400 },
        );
      }
      blockId = rawBlockId;
    } else {
      blockId = undefined;
    }

    const exerciseName =
      typeof body?.exerciseName === "string" ? body.exerciseName.trim() || null : null;
    const exerciseId =
      typeof body?.exerciseId === "string" ? body.exerciseId.trim() || null : null;

    const sets = typeof body?.sets === "number" ? body.sets : null;
    const reps = typeof body?.reps === "number" ? body.reps : null;

    const load = typeof body?.load === "string" ? body.load.trim() || null : null;
    const tempo = typeof body?.tempo === "string" ? body.tempo.trim() || null : null;
    const rest = typeof body?.rest === "string" ? body.rest.trim() || null : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;
    const athleteNotes =
      typeof body?.athleteNotes === "string" ? body.athleteNotes.trim() || null : null;
    const videoUrl =
      typeof body?.videoUrl === "string" ? body.videoUrl.trim() || null : null;

    const item = await prisma.routineItem.create({
      data: {
        routineId: routine.id,
        title,
        description,
        order,
        ...(blockId ? { blockId } : {}),
        exerciseName,
        exerciseId,
        sets,
        reps,
        load,
        tempo,
        rest,
        notes,
        athleteNotes,
        videoUrl,
      },
    });

    const data = {
      id: item.id,
      routineId: item.routineId,
      blockId: item.blockId ?? null,
      title: item.title,
      description: item.description ?? null,
      order: item.order,
      exerciseName: item.exerciseName ?? null,
      exerciseId: item.exerciseId ?? null,
      sets: item.sets ?? null,
      reps: item.reps ?? null,
      load: item.load ?? null,
      tempo: item.tempo ?? null,
      rest: item.rest ?? null,
      notes: item.notes ?? null,
      athleteNotes: item.athleteNotes ?? null,
      videoUrl: item.videoUrl ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine item create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
