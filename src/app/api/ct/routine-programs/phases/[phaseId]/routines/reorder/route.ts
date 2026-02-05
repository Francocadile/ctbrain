import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

async function getPhaseTeamScoped(prisma: any, teamId: string, phaseId: string) {
  return prisma.routineProgramPhase.findFirst({
    where: {
      id: phaseId,
      program: { teamId },
    },
    select: { id: true },
  });
}

// PATCH /api/ct/routine-programs/phases/[phaseId]/routines/reorder
export async function PATCH(req: Request, { params }: { params: { phaseId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const phase = await getPhaseTeamScoped(prisma as any, team.id, params.phaseId);
    if (!phase) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as any;
    const orderedRoutineIds = Array.isArray(body?.orderedRoutineIds) ? body.orderedRoutineIds : [];

    const clean = orderedRoutineIds
      .filter((x: any) => typeof x === "string")
      .map((x: string) => x.trim())
      .filter(Boolean);

    const existing = await prisma.routineProgramPhaseRoutine.findMany({
      where: { phaseId: phase.id },
      select: { id: true, routineId: true },
    });

    const existingIds = existing.map((r: any) => r.routineId);
    const existingSet = new Set(existingIds);

    // Validate: all provided ids must exist in this phase
    for (const rid of clean) {
      if (!existingSet.has(rid)) {
        return NextResponse.json({ ok: false, error: `routineId inválido: ${rid}` }, { status: 400 });
      }
    }

    // Validate: no duplicates
    if (new Set(clean).size !== clean.length) {
      return NextResponse.json({ ok: false, error: "orderedRoutineIds tiene duplicados" }, { status: 400 });
    }

    // You can reorder subset; items not included keep relative order after the reordered ones.
    const rest = existingIds.filter((rid: string) => !clean.includes(rid));
    const finalOrder = [...clean, ...rest];

    await prisma.$transaction(
      finalOrder.map((routineId: string, index: number) =>
        prisma.routineProgramPhaseRoutine.update({
          where: { phaseId_routineId: { phaseId: phase.id, routineId } },
          data: { order: index },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs reorder error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
