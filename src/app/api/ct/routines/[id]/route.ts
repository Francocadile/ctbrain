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

// PATCH /api/ct/routines/[id] -> editar cabecera { title, description, goal, visibility, notesForAthlete, shareMode, playerIds }
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

    let shareMode: "STAFF_ONLY" | "ALL_PLAYERS" | "SELECTED_PLAYERS" | undefined;
    if (typeof body?.shareMode === "string") {
      if (
        body.shareMode === "STAFF_ONLY" ||
        body.shareMode === "ALL_PLAYERS" ||
        body.shareMode === "SELECTED_PLAYERS"
      ) {
        shareMode = body.shareMode;
        data.shareMode = shareMode;
      } else {
        return new NextResponse("shareMode inválido", { status: 400 });
      }
    }

    const playerIds: string[] | undefined = Array.isArray(body?.playerIds)
      ? body.playerIds.filter((x: unknown): x is string => typeof x === "string" && (x as string).trim().length > 0)
      : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.routine.update({
        where: { id: existing.id },
        data,
      });

      if (shareMode && (shareMode === "STAFF_ONLY" || shareMode === "ALL_PLAYERS")) {
        await (tx as any).routinePlayerShare.deleteMany({
          where: { routineId: updated.id },
        });
      }

      if (shareMode === "SELECTED_PLAYERS") {
        if (!playerIds || playerIds.length === 0) {
          throw new NextResponse("playerIds requerido para SELECTED_PLAYERS", { status: 400 });
        }

        const validPlayers = await tx.user.findMany({
          where: {
            id: { in: playerIds },
            role: "JUGADOR",
            teams: {
              some: { teamId: team.id },
            },
          },
          select: { id: true },
        });

        const validIds = new Set(validPlayers.map((p) => p.id));
        const filteredIds = playerIds.filter((pid) => validIds.has(pid));

        await (tx as any).routinePlayerShare.deleteMany({
          where: { routineId: updated.id },
        });

        if (filteredIds.length > 0) {
          await (tx as any).routinePlayerShare.createMany({
            data: filteredIds.map((pid) => ({ routineId: updated.id, playerId: pid })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    const resp = {
      id: result.id,
      title: result.title,
      description: result.description ?? null,
      goal: result.goal ?? null,
      visibility: result.visibility ?? null,
      notesForAthlete: result.notesForAthlete ?? null,
      shareMode: result.shareMode,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
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
