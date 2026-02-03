import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

function isWeekday(x: unknown): x is Weekday {
  return (
    x === "MON" ||
    x === "TUE" ||
    x === "WED" ||
    x === "THU" ||
    x === "FRI" ||
    x === "SAT" ||
    x === "SUN"
  );
}

// POST /api/ct/programs/weeks/[weekId]/days -> crear día { weekday, baseRoutineId, titleOverride?, notes? }
// Crea un ProgramDay y una *copia* de la rutina base para que el editor existente pueda editarla sin afectar el template.
export async function POST(req: Request, { params }: { params: { weekId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const weekId = params.weekId;

    const week = await prisma.programWeek.findFirst({
      where: { id: weekId, teamId: team.id },
      select: { id: true, programId: true, teamId: true },
    });

    if (!week) return new NextResponse("week not found", { status: 404 });

    const body = await req.json();

    const weekday = body?.weekday;
    if (!isWeekday(weekday)) {
      return new NextResponse("weekday inválido", { status: 400 });
    }

    const baseRoutineId = typeof body?.baseRoutineId === "string" ? body.baseRoutineId.trim() : "";
    if (!baseRoutineId) return new NextResponse("baseRoutineId requerido", { status: 400 });

    const base = await prisma.routine.findFirst({
      where: { id: baseRoutineId, teamId: team.id },
      include: {
        blocks: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
        items: { orderBy: { order: "asc" } },
      },
    });

    if (!base) return new NextResponse("base routine not found", { status: 404 });

    const rawTitleOverride = body?.titleOverride;
    const titleOverride = typeof rawTitleOverride === "string" ? rawTitleOverride.trim() || null : null;

    const rawNotes = body?.notes;
    const notes = typeof rawNotes === "string" ? rawNotes.trim() || null : null;

    // Transaction: clone routine (header + blocks + items) + create ProgramDay
    const result = await prisma.$transaction(async (tx: any) => {
      const newRoutine = await tx.routine.create({
        data: {
          teamId: team.id,
          title: (titleOverride || base.title) + " (Programa)",
          description: base.description ?? null,
          goal: base.goal ?? null,
          visibility: base.visibility ?? undefined,
          notesForAthlete: base.notesForAthlete ?? null,
          shareMode: base.shareMode,
        },
      });

      // Clone blocks
      const blockIdMap = new Map<string, string>();
      for (const b of base.blocks) {
        const nb = await tx.routineBlock.create({
          data: {
            routineId: newRoutine.id,
            name: b.name,
            order: b.order,
            description: b.description ?? null,
            type: (b as any).type ?? null,
          } as any,
        });
        blockIdMap.set(b.id, nb.id);
      }

      // Clone items
      for (const it of base.items) {
        const newBlockId = it.blockId ? blockIdMap.get(it.blockId) ?? null : null;
        await tx.routineItem.create({
          data: {
            routineId: newRoutine.id,
            title: it.title,
            description: it.description ?? null,
            order: it.order,
            blockId: newBlockId,
            exerciseId: it.exerciseId ?? null,
            exerciseName: it.exerciseName ?? null,
            sets: it.sets ?? null,
            reps: it.reps ?? null,
            load: it.load ?? null,
            tempo: it.tempo ?? null,
            rest: it.rest ?? null,
            notes: it.notes ?? null,
            athleteNotes: it.athleteNotes ?? null,
            videoUrl: it.videoUrl ?? null,
          },
        });
      }

      const day = await tx.programDay.create({
        data: {
          weekId: week.id,
          teamId: team.id,
          weekday,
          routineId: newRoutine.id,
          titleOverride,
          notes,
        },
      });

      return { day, routine: newRoutine };
    });

    const data = {
      id: result.day.id,
      weekId: result.day.weekId,
      teamId: result.day.teamId,
      weekday: result.day.weekday,
      routineId: result.day.routineId,
      titleOverride: result.day.titleOverride ?? null,
      notes: result.day.notes ?? null,
      routine: {
        id: result.routine.id,
        title: result.routine.title,
      },
      createdAt: result.day.createdAt.toISOString(),
      updatedAt: result.day.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    if (String(error?.code) === "P2002") {
      return NextResponse.json({ error: "Ese weekday ya existe en la semana" }, { status: 409 });
    }
    console.error("ct program day create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
