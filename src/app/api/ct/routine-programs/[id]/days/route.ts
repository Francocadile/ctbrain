import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

type DayInput = {
  dayIndex: number;
  label?: string;
  routineId: string;
};

export async function PUT(req: Request, { params }: Params) {
  const programId = params?.id;
  if (!programId) {
    return NextResponse.json({ error: "programId requerido" }, { status: 400 });
  }

  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const p: any = prisma;

    const program = await p.routineProgram.findFirst({
      where: { id: programId, teamId: team.id },
      select: { id: true },
    });

    if (!program) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const rawDays = Array.isArray((body as any)?.days) ? (body as any).days : [];

    const days: DayInput[] = rawDays
      .map((d: any) => ({
        dayIndex: typeof d?.dayIndex === "number" ? d.dayIndex : Number(d?.dayIndex),
        label: typeof d?.label === "string" ? d.label.trim() || undefined : undefined,
        routineId: typeof d?.routineId === "string" ? d.routineId.trim() : "",
      }))
      .filter((d: DayInput) => Number.isFinite(d.dayIndex) && d.dayIndex >= 1 && !!d.routineId);

    // Validate routines exist and belong to team
    const routineIds = Array.from(new Set(days.map((d) => d.routineId)));
    const routines = await p.routine.findMany({
      where: { id: { in: routineIds }, teamId: team.id },
      select: { id: true },
    });

  const validRoutineIds = new Set(routines.map((r: any) => r.id));
    const invalid = routineIds.filter((id) => !validRoutineIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Rutinas inválidas para este equipo", invalidRoutineIds: invalid },
        { status: 400 },
      );
    }

    // Upsert each day by (programId, dayIndex)
    await p.$transaction(
      days.map((d) =>
        p.routineProgramDay.upsert({
          where: {
            programId_dayIndex: {
              programId: program.id,
              dayIndex: d.dayIndex,
            },
          },
          update: {
            label: d.label ?? null,
            routineId: d.routineId,
          },
          create: {
            programId: program.id,
            dayIndex: d.dayIndex,
            label: d.label ?? null,
            routineId: d.routineId,
          },
        }),
      ),
    );

    const saved = await p.routineProgramDay.findMany({
      where: { programId: program.id },
      orderBy: { dayIndex: "asc" },
      select: {
        id: true,
        dayIndex: true,
        label: true,
        routineId: true,
        routine: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({
      data: saved.map((d: any) => ({
        id: d.id,
        dayIndex: d.dayIndex,
        label: d.label ?? null,
        routineId: d.routineId,
        routineTitle: d.routine?.title ?? null,
      })),
    });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine programs days put error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
