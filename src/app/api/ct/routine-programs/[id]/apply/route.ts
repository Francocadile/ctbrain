import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

type ApplyMode = "cycle" | "truncate";

export async function POST(req: Request, { params }: Params) {
  const programId = params?.id;
  if (!programId) {
    return NextResponse.json({ error: "programId requerido" }, { status: 400 });
  }

  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const p: any = prisma;

    const body = await req.json().catch(() => null);

    const rawSessionIds = Array.isArray((body as any)?.sessionIds)
      ? (body as any).sessionIds
      : [];

    const sessionIds: string[] = rawSessionIds
      .map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
      .filter((x: string) => !!x);

    const startDayIndexRaw = (body as any)?.startDayIndex;
    const startDayIndex = Number.isFinite(startDayIndexRaw)
      ? (startDayIndexRaw as number)
      : Number(startDayIndexRaw);

    const start = Number.isFinite(startDayIndex) && startDayIndex >= 1 ? startDayIndex : 1;

    const modeRaw = (body as any)?.mode;
    const mode: ApplyMode = modeRaw === "truncate" ? "truncate" : "cycle";

    const program = await p.routineProgram.findFirst({
      where: { id: programId, teamId: team.id },
      select: { id: true },
    });

    if (!program) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const sessions = await p.session.findMany({
      where: { id: { in: sessionIds }, teamId: team.id },
      select: { id: true },
    });

    const validSessionIds = sessions.map((s: any) => s.id);

    const days = await p.routineProgramDay.findMany({
      where: { programId: program.id },
      orderBy: { dayIndex: "asc" },
      select: { dayIndex: true, routineId: true },
    });

    if (days.length === 0) {
      return NextResponse.json({ error: "El programa no tiene días configurados" }, { status: 400 });
    }

    // For each session (in provided order), choose a day config and apply snapshot using existing logic.
    // We replicate the current policy of /api/ct/routines/[id]/sessions:
    // - only create snapshots for sessions that don't already have SessionRoutineItem for that (routineId, sessionId)

    const applied: Array<{ sessionId: string; routineId: string; dayIndex: number }> = [];
    const skipped: Array<{ sessionId: string; routineId: string; dayIndex: number; reason: string }> = [];

    for (let i = 0; i < validSessionIds.length; i += 1) {
      const sessionId = validSessionIds[i];

      const logicalIdx = start + i;

      let day: (typeof days)[number] | null = null;
      if (mode === "truncate") {
        const pos = logicalIdx - 1;
        if (pos >= 0 && pos < days.length) day = days[pos];
      } else {
        const pos = (logicalIdx - 1) % days.length;
        day = days[pos];
      }

      if (!day) {
        skipped.push({ sessionId, routineId: "", dayIndex: logicalIdx, reason: "truncate" });
        continue;
      }

      // Validate routine belongs to team (belt and suspenders)
      const routine = await p.routine.findFirst({
        where: { id: day.routineId, teamId: team.id },
        select: { id: true },
      });
      if (!routine) {
        skipped.push({
          sessionId,
          routineId: day.routineId,
          dayIndex: day.dayIndex,
          reason: "routine_not_in_team",
        });
        continue;
      }

      const already = await p.sessionRoutineItem.findFirst({
        where: { sessionId, routineId: day.routineId },
        select: { id: true },
      });
      if (already) {
        skipped.push({
          sessionId,
          routineId: day.routineId,
          dayIndex: day.dayIndex,
          reason: "already_snapshotted",
        });
        continue;
      }

      const fullRoutine = await p.routine.findFirst({
        where: { id: day.routineId, teamId: team.id },
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
          items: {
            where: { blockId: null },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!fullRoutine) {
        skipped.push({ sessionId, routineId: day.routineId, dayIndex: day.dayIndex, reason: "routine_missing" });
        continue;
      }

      const createData: {
        sessionId: string;
        routineId: string;
        routineItemId: string;
        blockName: string | null;
        blockType: string | null;
        title: string;
        sets: number | null;
        reps: number | null;
        load: string | null;
        tempo: string | null;
        rest: string | null;
        notes: string | null;
        athleteNotes: string | null;
        order: number;
      }[] = [];

      let order = 1;
      for (const block of fullRoutine.blocks) {
        for (const it of block.items) {
          createData.push({
            sessionId,
            routineId: fullRoutine.id,
            routineItemId: it.id,
            blockName: block.name || "Bloque",
            blockType: block.type ? String(block.type) : null,
            title: it.exerciseName || it.title || "Ejercicio",
            sets: it.sets ?? null,
            reps: it.reps ?? null,
            load: it.load ?? null,
            tempo: it.tempo ?? null,
            rest: it.rest ?? null,
            notes: it.notes ?? null,
            athleteNotes: it.athleteNotes ?? null,
            order,
          });
          order += 1;
        }
      }

      for (const it of fullRoutine.items) {
        createData.push({
          sessionId,
          routineId: fullRoutine.id,
          routineItemId: it.id,
          blockName: "Sin bloque",
          blockType: null,
          title: it.exerciseName || it.title || "Ejercicio",
          sets: it.sets ?? null,
          reps: it.reps ?? null,
          load: it.load ?? null,
          tempo: it.tempo ?? null,
          rest: it.rest ?? null,
          notes: it.notes ?? null,
          athleteNotes: it.athleteNotes ?? null,
          order,
        });
        order += 1;
      }

      if (createData.length > 0) {
        await p.sessionRoutineItem.createMany({ data: createData, skipDuplicates: true });
      }

      applied.push({ sessionId, routineId: day.routineId, dayIndex: day.dayIndex });
    }

    return NextResponse.json({
      data: {
        sessionIds: validSessionIds,
        appliedCount: applied.length,
        skippedCount: skipped.length,
        applied,
        skipped,
      },
    });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine programs apply error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
