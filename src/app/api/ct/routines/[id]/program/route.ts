import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type MappingDay = { weekday: Weekday; routineId: string };
type MappingWeek = { id: string; weekNumber: number; label: string | null; days: MappingDay[] };

function normalizeWeekday(x: unknown): Weekday | null {
  return WEEKDAYS.includes(x as any) ? (x as Weekday) : null;
}

async function getMapping(prisma: any, teamId: string, baseRoutineId: string) {
  // We use Program.description as a stable marker to find the program created for this base routine.
  const marker = `BASE_ROUTINE:${baseRoutineId}`;

  const program = await prisma.program.findFirst({
    where: {
      teamId,
      description: marker,
    },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: { days: true },
      },
    },
  });

  if (!program) return null;

  const weeks: MappingWeek[] = (program.weeks || []).map((w: any) => ({
    id: w.id as string,
    weekNumber: w.weekNumber as number,
    label: (w.label ?? null) as string | null,
    days: (w.days || []).map((d: any) => ({
      weekday: d.weekday as Weekday,
      routineId: d.routineId as string,
    })),
  }));

  return {
    programId: program.id as string,
    weeks,
  };
}

async function ensureProgram(prisma: any, teamId: string, baseRoutineId: string) {
  const existing = await getMapping(prisma, teamId, baseRoutineId);
  if (existing) return existing;

  const base = await prisma.routine.findFirst({
    where: { id: baseRoutineId, teamId },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!base) {
    return { error: "Rutina no encontrada" as const };
  }

  const marker = `BASE_ROUTINE:${baseRoutineId}`;

  const created = await prisma.$transaction(async (tx: any) => {
    const program = await tx.program.create({
      data: {
        teamId,
        title: `Programa: ${base.title}`,
        description: marker,
      },
      select: { id: true },
    });

    // 1) Ensure 4 weeks (weekNumber 1..4)
    const weeks: Array<{ id: string; weekNumber: number; label: string | null }> = [];
    for (let weekNumber = 1; weekNumber <= 4; weekNumber++) {
      const w = await tx.programWeek.create({
        data: {
          teamId,
          programId: program.id,
          weekNumber,
          label: `Semana ${weekNumber}`,
        },
        select: { id: true, weekNumber: true, label: true },
      });
      weeks.push({ id: w.id, weekNumber: w.weekNumber, label: w.label ?? null });
    }

    // 2) Clone base routine ONLY 7 times (one per weekday)
    const routineIdByWeekday = new Map<Weekday, string>();

    for (const weekday of WEEKDAYS) {
      const weekdayRoutine = await tx.routine.create({
        data: {
          teamId,
          title: `${base.title} (${weekday})`,
          description: base.description ?? null,
          goal: base.goal ?? null,
          visibility: base.visibility ?? undefined,
          notesForAthlete: base.notesForAthlete ?? null,
          shareMode: base.shareMode,
        },
        select: { id: true },
      });

      routineIdByWeekday.set(weekday, weekdayRoutine.id);

      const blockIdMap = new Map<string, string>();
      for (const b of base.blocks) {
        const nb = await tx.routineBlock.create({
          data: {
            routineId: weekdayRoutine.id,
            name: b.name,
            order: b.order,
            description: b.description ?? null,
            type: (b as any).type ?? null,
          } as any,
          select: { id: true },
        });
        blockIdMap.set(b.id, nb.id);
      }

      for (const it of base.items) {
        const newBlockId = it.blockId ? blockIdMap.get(it.blockId) ?? null : null;
        await tx.routineItem.create({
          data: {
            routineId: weekdayRoutine.id,
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
    }

    // 3) For each week create 7 ProgramDays pointing to the SAME weekday routine
    for (const w of weeks) {
      for (const weekday of WEEKDAYS) {
        const routineId = routineIdByWeekday.get(weekday);
        if (!routineId) continue;
        await tx.programDay.create({
          data: {
            weekId: w.id,
            teamId,
            weekday,
            routineId,
          },
          select: { id: true },
        });
      }
    }

    const payloadWeeks: MappingWeek[] = weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      label: w.label,
      days: WEEKDAYS.map((weekday) => ({
        weekday,
        routineId: routineIdByWeekday.get(weekday)!,
      })),
    }));

    return { programId: program.id, weeks: payloadWeeks };
  });

  return created;
}

// GET /api/ct/routines/[id]/program -> mapping (no mutation)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const mapping = await getMapping(prisma as any, team.id, id);

    if (!mapping) {
      return NextResponse.json(
        {
          programId: null,
          weeks: [],
        },
        { status: 200 },
      );
    }

    return NextResponse.json(mapping);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine program get error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/routines/[id]/program -> ensureProgram (idempotent)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const id = params.id;
    // optional validation of weekday requested (not required now)
    const body = await req.json().catch(() => null);
    if (body?.weekday && !normalizeWeekday(body.weekday)) {
      return new NextResponse("weekday inválido", { status: 400 });
    }

    const result = await ensureProgram(prisma as any, team.id, id);
    if ((result as any)?.error === "Rutina no encontrada") {
      return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine program ensure error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
