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

// DELETE /api/ct/routine-programs/phases/[phaseId]/routines/[routineId]
export async function DELETE(
  req: Request,
  { params }: { params: { phaseId: string; routineId: string } },
) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const phase = await getPhaseTeamScoped(prisma as any, team.id, params.phaseId);
    if (!phase) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    await prisma.routineProgramPhaseRoutine.deleteMany({
      where: { phaseId: phase.id, routineId: params.routineId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs remove routine error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
