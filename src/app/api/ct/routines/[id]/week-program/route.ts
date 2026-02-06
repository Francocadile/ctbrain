import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type MappingDay = { weekday: Weekday; routineId: string };
type MappingWeek = { weekNumber: number; label: string | null; days: MappingDay[] };

type Payload = { programId: string; weeks: MappingWeek[] };

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

async function cloneRoutine(tx: any, teamId: string, fromRoutine: any, title: string) {
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

  return newRoutine.id as string;
}

function dayIndexFrom(weekNumber: number, weekday: Weekday) {
  const weekdayIndex = WEEKDAYS.indexOf(weekday);
  return (weekNumber - 1) * 7 + weekdayIndex;
}

async function ensureWeekProgram(prisma: any, teamId: string, baseRoutineId: string): Promise<Payload> {
  const marker = `BASE_ROUTINE:${baseRoutineId}`;

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

  const ensured = await prisma.$transaction(async (tx: any) => {
    // Program
    const programs = await tx.routineProgram.findMany({
      where: { teamId, description: marker },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });

    if (programs.length > 1) {
      console.warn("Multiple RoutinePrograms found for BASE_ROUTINE marker; using most recent", {
        marker,
        teamId,
        programIds: programs.map((p: any) => p.id),
      });
    }

    let program = programs[0] ?? null;

    if (!program) {
      program = await tx.routineProgram.create({
        data: {
          teamId,
          title: `Programa semanal: ${base.title}`,
          description: marker,
        },
        select: { id: true },
      });
    }

    // Existing days
    const existingDays = await tx.routineProgramDay.findMany({
      where: { teamId, programId: program.id },
      select: { id: true, dayIndex: true, routineId: true },
      orderBy: [{ dayIndex: "asc" }],
    });

    const byDayIndex = new Map<number, { id: string; routineId: string }>();
    for (const d of existingDays) byDayIndex.set(d.dayIndex, { id: d.id, routineId: d.routineId });

    // Ensure dayIndex 0..27 exists. Simpler: clone base for each missing day.
    for (let dayIndex = 0; dayIndex < 28; dayIndex++) {
      if (byDayIndex.has(dayIndex)) continue;
      const routineId = await cloneRoutine(tx, teamId, base, `${base.title} (Día ${dayIndex + 1})`);
      const created = await tx.routineProgramDay.create({
        data: {
          teamId,
          programId: program.id,
          dayIndex,
          routineId,
        },
        select: { id: true, routineId: true },
      });
      byDayIndex.set(dayIndex, { id: created.id, routineId: created.routineId });
    }

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

  return ensured;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const baseRoutineId = params.id;

    const payload = await ensureWeekProgram(prisma as any, team.id, baseRoutineId);
    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct week-program get error", error);
    if (error?.message === "Rutina no encontrada") {
      return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
