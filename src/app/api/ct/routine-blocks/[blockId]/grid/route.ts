import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routine-blocks/[blockId]/grid -> grilla (days) con lookup de Routine.title
export async function GET(req: Request, { params }: { params: { blockId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const blockId = params.blockId;

    // Cargar bloque validando pertenencia al team (bloque -> fase -> programa -> team)
    const block = await prisma.routineProgramBlock.findFirst({
      where: { id: blockId, phase: { program: { teamId: team.id } } },
      select: {
        id: true,
        phaseId: true,
        key: true,
        title: true,
        order: true,
        durationWeeks: true,
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const days = await prisma.routineProgramBlockDay.findMany({
      where: { blockId: block.id },
      orderBy: [{ dayIndex: "asc" }],
      select: {
        id: true,
        dayIndex: true,
        label: true,
        routineId: true,
      },
    });

    // Lookup de títulos para mostrar en UI (si existen)
    const routineIds = Array.from(new Set(days.map((d: any) => d.routineId).filter(Boolean)));
    const routines = routineIds.length
      ? await prisma.routine.findMany({
          where: { id: { in: routineIds }, teamId: team.id },
          select: { id: true, title: true },
        })
      : [];

    const titleByRoutineId = new Map<string, string>();
    for (const r of routines) titleByRoutineId.set(r.id, r.title);

    const data = {
      block: {
        id: block.id,
        phaseId: block.phaseId,
        key: block.key,
        title: block.title ?? null,
        order: block.order,
        durationWeeks: block.durationWeeks,
      },
      days: days.map((d: any) => ({
        id: d.id,
        dayIndex: d.dayIndex,
        label: d.label ?? null,
        routineId: d.routineId,
        routineTitle: titleByRoutineId.get(d.routineId) ?? null,
      })),
    };

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine-block grid error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
