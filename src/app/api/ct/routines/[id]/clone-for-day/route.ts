import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function isWeekday(x: unknown): x is Weekday {
  return WEEKDAYS.includes(x as any);
}

function dayIndexFrom(weekNumber: number, weekday: Weekday) {
  const weekdayIndex = WEEKDAYS.indexOf(weekday);
  return (weekNumber - 1) * 7 + weekdayIndex;
}

// POST /api/ct/routines/[id]/clone-for-day
// body: { weekNumber: number, weekday: ProgramWeekday }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const baseRoutineId = params.id;
    const body = (await req.json().catch(() => ({}))) as any;

    const weekNumber = Number(body?.weekNumber);
    if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 4) {
      return NextResponse.json({ ok: false, error: "weekNumber inválido" }, { status: 400 });
    }

    const weekday = body?.weekday;
    if (!isWeekday(weekday)) {
      return NextResponse.json({ ok: false, error: "weekday inválido" }, { status: 400 });
    }

    const marker = `BASE_ROUTINE:${baseRoutineId}`;
    const dayIndex = dayIndexFrom(weekNumber, weekday);
    if (dayIndex < 0 || dayIndex > 27) {
      return NextResponse.json({ ok: false, error: "dayIndex inválido" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const programs = await tx.routineProgram.findMany({
        where: { teamId: team.id, description: marker },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      });

      if (programs.length > 1) {
        console.warn("Multiple RoutinePrograms found for BASE_ROUTINE marker in clone-for-day; using most recent", {
          marker,
          teamId: team.id,
          programIds: programs.map((p: any) => p.id),
        });
      }

      const program = programs[0] ?? null;

      if (!program) {
        return { error: "program no encontrado" as const };
      }

      const day = await tx.routineProgramDay.findFirst({
        where: { teamId: team.id, programId: program.id, dayIndex },
        select: { id: true, routineId: true },
      });

      if (!day) {
        return { error: "day no encontrado" as const };
      }

      const currentRoutineId = day.routineId;

      const fromRoutine = await tx.routine.findFirst({
        where: { id: currentRoutineId, teamId: team.id },
        include: {
          blocks: { orderBy: { order: "asc" } },
          items: { orderBy: { order: "asc" } },
        },
      });

      if (!fromRoutine) {
        return { error: "rutina no encontrada" as const };
      }

      const newRoutine = await tx.routine.create({
        data: {
          teamId: team.id,
          title: `${fromRoutine.title} (Copia)` ,
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

      if (Array.isArray(fromRoutine.items) && fromRoutine.items.length) {
        for (const it of fromRoutine.items) {
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
      }

      await tx.routineProgramDay.update({
        where: { id: day.id },
        data: { routineId: newRoutine.id },
        select: { id: true },
      });

      return { ok: true as const, newRoutineId: newRoutine.id as string };
    });

    if ((result as any)?.error === "program no encontrado") {
      return NextResponse.json({ ok: false, error: "program no encontrado" }, { status: 404 });
    }
    if ((result as any)?.error === "day no encontrado") {
      return NextResponse.json({ ok: false, error: "day no encontrado" }, { status: 404 });
    }
    if ((result as any)?.error === "rutina no encontrada") {
      return NextResponse.json({ ok: false, error: "rutina no encontrada" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine clone-for-day error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
