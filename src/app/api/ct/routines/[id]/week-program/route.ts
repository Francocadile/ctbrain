import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type MappingDay = { weekday: Weekday; routineId: string };
type MappingWeek = { weekNumber: number; label: string | null; days: MappingDay[] };

type Payload = { programId: string; weeks: MappingWeek[] };

function mkReqId() {
  // Short, URL-safe-ish id for correlating server logs with browser 500s.
  return Math.random().toString(36).slice(2, 8);
}

function logCtx(reqId: string, extra: Record<string, unknown>) {
  return { reqId, ...extra };
}

function cloneData(fromRoutine: any, teamId: string, title: string) {
  return {
    teamId,
    title,
    description: fromRoutine.description ?? null,
    goal: fromRoutine.goal ?? null,
    visibility: fromRoutine.visibility ?? undefined,
    notesForAthlete: fromRoutine.notesForAthlete ?? null,
    shareMode: fromRoutine.shareMode,
  };
}

async function cloneRoutine(tx: any, teamId: string, fromRoutine: any, title: string, reqId?: string) {
  if (reqId) {
    console.warn(
      "ct week-program cloneRoutine start",
      logCtx(reqId, {
        step: "cloneRoutine:start",
        teamId,
        fromRoutineId: fromRoutine?.id ?? null,
        blocksCount: Array.isArray(fromRoutine?.blocks) ? fromRoutine.blocks.length : 0,
        itemsCount: Array.isArray(fromRoutine?.items) ? fromRoutine.items.length : 0,
        title,
      }),
    );
  }

  const newRoutine = await tx.routine.create({
    data: cloneData(fromRoutine, teamId, title) as any,
    select: { id: true },
  });

  const blockIdMap = new Map<string, string>();
  for (const b of fromRoutine.blocks || []) {
    const nb = await tx.routineBlock.create({
      data: {
        routineId: newRoutine.id,
        name: b.name,
        order: b.order,
        description: b.description ?? null,
        type: (b as any).type ?? null,
      } as any,
      select: { id: true },
    });
    blockIdMap.set(b.id, nb.id);
  }

  for (const it of fromRoutine.items || []) {
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

  if (reqId) {
    console.warn(
      "ct week-program cloneRoutine done",
      logCtx(reqId, {
        step: "cloneRoutine:done",
        teamId,
        newRoutineId: newRoutine.id,
      }),
    );
  }

  return newRoutine.id as string;
}

function dayIndexFrom(weekNumber: number, weekday: Weekday) {
  const weekdayIndex = WEEKDAYS.indexOf(weekday);
  return (weekNumber - 1) * 7 + weekdayIndex;
}

async function ensureWeekProgram(
  prisma: any,
  teamId: string,
  baseRoutineId: string,
  reqId: string,
): Promise<Payload> {
  const marker = `BASE_ROUTINE:${baseRoutineId}`;

  console.warn(
    "ct week-program ensure start",
    logCtx(reqId, { step: "ensure:start", teamId, baseRoutineId, marker }),
  );

  const base = await prisma.routine.findFirst({
    where: { id: baseRoutineId, teamId },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!base) {
    throw new Error("Rutina no encontrada");
  }

  console.warn(
    "ct week-program base loaded",
    logCtx(reqId, {
      step: "base:loaded",
      teamId,
      baseRoutineId,
      baseTitle: base?.title ?? null,
      blocksCount: Array.isArray(base?.blocks) ? base.blocks.length : 0,
      itemsCount: Array.isArray(base?.items) ? base.items.length : 0,
    }),
  );

  const ensured = await prisma.$transaction(async (tx: any) => {
    console.warn(
      "ct week-program tx begin",
      logCtx(reqId, { step: "tx:begin", teamId, baseRoutineId, marker }),
    );

    // Program (team-scoped). Security for RoutineProgramDay is enforced by selecting the program by teamId,
    // then reading/writing days ONLY by programId (RoutineProgramDay has no teamId in production).
    console.warn(
      "ct week-program routineProgram findMany start",
      logCtx(reqId, { step: "program:findMany:start", teamId, baseRoutineId, marker }),
    );
    const programs = await tx.routineProgram.findMany({
      where: { teamId, description: marker },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });

    console.warn(
      "ct week-program routineProgram findMany done",
      logCtx(reqId, {
        step: "program:findMany:done",
        teamId,
        baseRoutineId,
        marker,
        programsCount: programs.length,
        programId: programs[0]?.id ?? null,
      }),
    );

    if (programs.length > 1) {
      console.warn("Multiple RoutinePrograms found for BASE_ROUTINE marker; using most recent", {
        marker,
        teamId,
        programIds: programs.map((p: any) => p.id),
      });
    }

    let program = programs[0] ?? null;

    if (!program) {
      console.warn(
        "ct week-program routineProgram create start",
        logCtx(reqId, { step: "program:create:start", teamId, baseRoutineId, marker }),
      );
      program = await tx.routineProgram.create({
        data: {
          teamId,
          title: `Programa semanal: ${base.title}`,
          description: marker,
        },
        select: { id: true },
      });
      console.warn(
        "ct week-program routineProgram create done",
        logCtx(reqId, {
          step: "program:create:done",
          teamId,
          baseRoutineId,
          marker,
          programId: program.id,
        }),
      );
    }

    console.warn(
      "ct week-program routineProgram ready",
      logCtx(reqId, {
        step: "program:ready",
        teamId,
        baseRoutineId,
        marker,
        programId: program.id,
      }),
    );

    // Existing days
    console.warn(
      "ct week-program routineProgramDay findMany start",
      logCtx(reqId, { step: "days:findMany:start", teamId, baseRoutineId, programId: program.id }),
    );
    const existingDays = await tx.routineProgramDay.findMany({
      where: { programId: program.id },
      select: { id: true, dayIndex: true, routineId: true },
      orderBy: [{ dayIndex: "asc" }],
    });

    console.warn(
      "ct week-program routineProgramDay findMany done",
      logCtx(reqId, {
        step: "days:findMany:done",
        teamId,
        baseRoutineId,
        programId: program.id,
        existingDaysCount: existingDays.length,
      }),
    );

    const byDayIndex = new Map<number, { id: string; routineId: string }>();
    for (const d of existingDays) byDayIndex.set(d.dayIndex, { id: d.id, routineId: d.routineId });

    // Ensure dayIndex 0..27 exists. Simpler: clone base for each missing day.
    let missingCount = 0;
    let createdCount = 0;
    const missingSamples: number[] = [];
    for (let dayIndex = 0; dayIndex < 28; dayIndex++) {
      if (byDayIndex.has(dayIndex)) continue;
      missingCount++;
      if (missingSamples.length < 3) missingSamples.push(dayIndex);

      if (missingSamples.includes(dayIndex)) {
        console.warn(
          "ct week-program missing dayIndex",
          logCtx(reqId, {
            step: "days:missing",
            teamId,
            baseRoutineId,
            programId: program.id,
            dayIndex,
            missingSoFar: missingCount,
          }),
        );
      }

      const routineId = await cloneRoutine(tx, teamId, base, `${base.title} (Día ${dayIndex + 1})`, reqId);
      const created = await tx.routineProgramDay.create({
        data: {
          programId: program.id,
          dayIndex,
          routineId,
        },
        select: { id: true, routineId: true },
      });
      createdCount++;
      byDayIndex.set(dayIndex, { id: created.id, routineId: created.routineId });
    }

    console.warn(
      "ct week-program ensure days done",
      logCtx(reqId, {
        step: "days:ensure:done",
        teamId,
        baseRoutineId,
        programId: program.id,
        existingDaysCount: existingDays.length,
        missingCount,
        createdCount,
        missingSamples,
      }),
    );

    const weeks: MappingWeek[] = [1, 2, 3, 4].map((weekNumber) => {
      const days: MappingDay[] = WEEKDAYS.map((weekday) => {
        const idx = dayIndexFrom(weekNumber, weekday);
        const row = byDayIndex.get(idx);
        return { weekday, routineId: row!.routineId };
      });

      return {
        weekNumber,
        label: `Semana ${weekNumber}`,
        days,
      };
    });

    return { programId: program.id as string, weeks } satisfies Payload;
  });

  console.warn(
    "ct week-program ensure done",
    logCtx(reqId, { step: "ensure:done", teamId, baseRoutineId, marker, programId: ensured.programId }),
  );

  return ensured;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const reqId = mkReqId();
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const baseRoutineId = params.id;

    console.warn(
      "ct week-program GET start",
      logCtx(reqId, { step: "handler:start", teamId: team.id, baseRoutineId }),
    );

    const payload = await ensureWeekProgram(prisma as any, team.id, baseRoutineId, reqId);
    console.warn(
      "ct week-program GET ok",
      logCtx(reqId, { step: "handler:ok", teamId: team.id, baseRoutineId, programId: payload.programId }),
    );
    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error(
      "ct week-program get error",
      logCtx(reqId, {
        step: "handler:error",
        baseRoutineId: params?.id ?? null,
        message: error?.message || String(error),
      }),
      error,
    );
    if (error?.message === "Rutina no encontrada") {
      return NextResponse.json({ error: "Rutina no encontrada", reqId }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || "Error", reqId }, { status: 500 });
  }
}
