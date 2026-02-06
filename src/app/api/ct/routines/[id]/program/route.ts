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

  const programs = await prisma.program.findMany({
    where: {
      teamId,
      description: marker,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: { days: true },
      },
    },
  });

  if (programs.length > 1) {
    console.warn("Multiple Programs found for BASE_ROUTINE marker; using most recent", {
      marker,
      teamId,
      programIds: programs.map((p: any) => p.id),
    });
  }

  const program = programs[0] ?? null;

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

  // Helper to clone a routine (with blocks/items) into a brand new routine.
  async function cloneRoutine(tx: any, fromRoutine: any, title: string) {
    const newRoutine = await tx.routine.create({
      data: {
        teamId,
        title,
        description: fromRoutine.description ?? null,
        goal: fromRoutine.goal ?? null,
        visibility: fromRoutine.visibility ?? undefined,
        notesForAthlete: fromRoutine.notesForAthlete ?? null,
        shareMode: fromRoutine.shareMode,
      },
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

  const ensured = await prisma.$transaction(async (tx: any) => {
    // Program
    const existingPrograms = await tx.program.findMany({
      where: { teamId, description: marker },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });

    if (existingPrograms.length > 1) {
      console.warn("Multiple Programs found for BASE_ROUTINE marker in ensureProgram; using most recent", {
        marker,
        teamId,
        programIds: existingPrograms.map((p: any) => p.id),
      });
    }

    let program = existingPrograms[0] ?? null;

    if (!program) {
      program = await tx.program.create({
        data: {
          teamId,
          title: `Programa: ${base.title}`,
          description: marker,
        },
        select: { id: true },
      });
    }

    // Weeks 1..4
    const existingWeeks = await tx.programWeek.findMany({
      where: { teamId, programId: program.id, weekNumber: { in: [1, 2, 3, 4] } },
      select: { id: true, weekNumber: true, label: true },
      orderBy: { weekNumber: "asc" },
    });

    const weekByNumber = new Map<number, { id: string; weekNumber: number; label: string | null }>();
    for (const w of existingWeeks) {
      weekByNumber.set(w.weekNumber, { id: w.id, weekNumber: w.weekNumber, label: w.label ?? null });
    }
    for (let weekNumber = 1; weekNumber <= 4; weekNumber++) {
      if (!weekByNumber.has(weekNumber)) {
        const w = await tx.programWeek.create({
          data: {
            teamId,
            programId: program.id,
            weekNumber,
            label: `Semana ${weekNumber}`,
          },
          select: { id: true, weekNumber: true, label: true },
        });
        weekByNumber.set(w.weekNumber, { id: w.id, weekNumber: w.weekNumber, label: w.label ?? null });
      }
    }

    // Existing ProgramDays for these weeks
    const weekIds = Array.from(weekByNumber.values()).map((w) => w.id);
    const existingDays = await tx.programDay.findMany({
      where: { teamId, weekId: { in: weekIds } },
      select: { weekId: true, weekday: true, routineId: true },
    });

    const routineIdByWeekdayWeek = new Map<string, string>();
    for (const d of existingDays) {
      routineIdByWeekdayWeek.set(`${d.weekId}:${d.weekday}`, d.routineId);
    }

    // Ensure Week 1 has 7 routines cloned from BASE (one per weekday)
    const w1 = weekByNumber.get(1)!;
    const w1RoutineIdByWeekday = new Map<Weekday, string>();

    for (const weekday of WEEKDAYS) {
      const key = `${w1.id}:${weekday}`;
      let routineId = routineIdByWeekdayWeek.get(key);
      if (!routineId) {
        routineId = await cloneRoutine(tx, base, `${base.title} (W1 ${weekday})`);
        await tx.programDay.create({
          data: { weekId: w1.id, teamId, weekday, routineId },
          select: { id: true },
        });
        routineIdByWeekdayWeek.set(key, routineId);
      }
      w1RoutineIdByWeekday.set(weekday, routineId);
    }

    // Load Week 1 routines content for cloning (blocks/items)
    const w1RoutineIds = Array.from(w1RoutineIdByWeekday.values());
    const w1Routines = await tx.routine.findMany({
      where: { teamId, id: { in: w1RoutineIds } },
      include: {
        blocks: { orderBy: { order: "asc" } },
        items: { orderBy: { order: "asc" } },
      },
    });
    const w1RoutineById = new Map<string, any>();
    for (const r of w1Routines) w1RoutineById.set(r.id, r);

    // Ensure Weeks 2..4 cloned from Week 1's corresponding weekday routine
    for (let weekNumber = 2; weekNumber <= 4; weekNumber++) {
      const w = weekByNumber.get(weekNumber)!;
      for (const weekday of WEEKDAYS) {
        const key = `${w.id}:${weekday}`;
        let routineId = routineIdByWeekdayWeek.get(key);
        if (routineId) continue;

        const sourceRoutineId = w1RoutineIdByWeekday.get(weekday);
        const sourceRoutine = sourceRoutineId ? w1RoutineById.get(sourceRoutineId) : null;
        // Fallback to base if for some reason W1 isn't available (shouldn't happen)
        const fromRoutine = sourceRoutine ?? base;
        routineId = await cloneRoutine(tx, fromRoutine, `${base.title} (W${weekNumber} ${weekday})`);

        await tx.programDay.create({
          data: { weekId: w.id, teamId, weekday, routineId },
          select: { id: true },
        });
        routineIdByWeekdayWeek.set(key, routineId);
      }
    }

    // Build response payload (weeks + days)
    const payloadWeeks: MappingWeek[] = Array.from(weekByNumber.values())
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((w) => ({
        id: w.id,
        weekNumber: w.weekNumber,
        label: w.label,
        days: WEEKDAYS.map((weekday) => ({
          weekday,
          routineId: routineIdByWeekdayWeek.get(`${w.id}:${weekday}`)!,
        })),
      }));

    return { programId: program.id as string, weeks: payloadWeeks };
  });

  return ensured;
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
