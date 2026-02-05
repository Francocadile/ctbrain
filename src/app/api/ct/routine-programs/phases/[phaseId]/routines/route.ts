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

// GET /api/ct/routine-programs/phases/[phaseId]/routines
export async function GET(req: Request, { params }: { params: { phaseId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const phase = await getPhaseTeamScoped(prisma as any, team.id, params.phaseId);
    if (!phase) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const phaseRoutines = await prisma.routineProgramPhaseRoutine.findMany({
      where: { phaseId: phase.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        phaseId: true,
        routineId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const ids = Array.from(new Set(phaseRoutines.map((r: any) => r.routineId).filter(Boolean)));
    const routines = ids.length
      ? await prisma.routine.findMany({
          where: { teamId: team.id, id: { in: ids } },
          select: { id: true, title: true },
        })
      : [];

    const titleById = new Map<string, string>();
    for (const r of routines) titleById.set(r.id, r.title);

    const items = phaseRoutines.map((r: any) => ({
      ...r,
      routineTitle: titleById.get(r.routineId) ?? null,
    }));

    return NextResponse.json({ ok: true, routines: items });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine-programs list phase routines error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/routine-programs/phases/[phaseId]/routines
export async function POST(req: Request, { params }: { params: { phaseId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const phase = await getPhaseTeamScoped(prisma as any, team.id, params.phaseId);
    if (!phase) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as any;
    const routineId = typeof body?.routineId === "string" ? body.routineId.trim() : "";
    if (!routineId) return NextResponse.json({ ok: false, error: "routineId requerido" }, { status: 400 });

    // Ensure the routine belongs to the team
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, teamId: team.id },
      select: { id: true },
    });
    if (!routine) return NextResponse.json({ ok: false, error: "Rutina no encontrada" }, { status: 404 });

    // Idempotent: if exists, return ok
    const existing = await prisma.routineProgramPhaseRoutine.findFirst({
      where: { phaseId: phase.id, routineId },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, routine: { id: existing.id } });

    const maxOrder = await prisma.routineProgramPhaseRoutine.aggregate({
      where: { phaseId: phase.id },
      _max: { order: true },
    });

    const created = await prisma.routineProgramPhaseRoutine.create({
      data: {
        phaseId: phase.id,
        routineId,
        order: (maxOrder?._max?.order ?? -1) + 1,
      },
      select: { id: true, phaseId: true, routineId: true, order: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, routine: created }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs add routine error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
