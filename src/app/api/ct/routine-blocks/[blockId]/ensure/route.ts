import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// POST /api/ct/routine-blocks/[blockId]/ensure
// Inicializa la grilla del bloque: crea RoutineProgramBlockDay + Routine vacía por día faltante.
export async function POST(req: Request, { params }: { params: { blockId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const blockId = params.blockId;

    // 1) Validar blockId pertenece al team (block -> phase -> program -> team)
    // + Traer datos necesarios para nombres (program/phase) y durationWeeks
    const block = await prisma.routineProgramBlock.findFirst({
      where: { id: blockId, phase: { program: { teamId: team.id } } },
      select: {
        id: true,
        key: true,
        durationWeeks: true,
        phase: {
          select: {
            id: true,
            title: true,
            program: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    // 2) durationWeeks -> totalDays
    const durationWeeks = Number(block.durationWeeks);
    if (!Number.isFinite(durationWeeks) || durationWeeks <= 0) {
      return NextResponse.json({ error: "Invalid durationWeeks" }, { status: 400 });
    }

    const totalDays = Math.max(0, durationWeeks) * 7;

    // 3) Traer days existentes
    const existingDays = await prisma.routineProgramBlockDay.findMany({
      where: { blockId: block.id },
      select: { dayIndex: true },
    });

  const existingSet = new Set<number>(existingDays.map((d: { dayIndex: number }) => d.dayIndex));
    const missingDayIndexes: number[] = [];
    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      if (!existingSet.has(dayIndex)) missingDayIndexes.push(dayIndex);
    }

    // 4) Crear faltantes en transacción
    const programTitle = block.phase.program.title;
    const phaseTitle = block.phase.title;

    const createdDays = await prisma.$transaction(async (tx) => {
      let created = 0;

      for (const dayIndex of missingDayIndexes) {
        const routineTitle = `${programTitle} - ${phaseTitle} - ${block.key} - Día ${dayIndex + 1}`;

        const routine = await tx.routine.create({
          data: {
            teamId: team.id,
            title: routineTitle,
          },
          select: { id: true },
        });

        await tx.routineProgramBlockDay.create({
          data: {
            blockId: block.id,
            dayIndex,
            routineId: routine.id,
          },
          select: { id: true },
        });

        created++;
      }

      return created;
    });

    // 5) Responder
    return NextResponse.json({ ok: true, createdDays, totalDays });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-block ensure error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
