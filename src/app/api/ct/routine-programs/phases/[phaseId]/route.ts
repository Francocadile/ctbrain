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
    select: {
      id: true,
      title: true,
      order: true,
      programId: true,
    },
  });
}

// PATCH /api/ct/routine-programs/phases/[phaseId]
export async function PATCH(req: Request, { params }: { params: { phaseId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const phase = await getPhaseTeamScoped(prisma as any, team.id, params.phaseId);
    if (!phase) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as any;
    const data: any = {};

    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (!t) return NextResponse.json({ ok: false, error: "title inválido" }, { status: 400 });
      data.title = t;
    }

    if (typeof body?.order === "number" && Number.isFinite(body.order)) {
      data.order = Math.max(0, Math.floor(body.order));
    }

    await prisma.routineProgramPhase.update({
      where: { id: phase.id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs patch phase error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routine-programs/phases/[phaseId]
export async function DELETE(req: Request, { params }: { params: { phaseId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const phase = await getPhaseTeamScoped(prisma as any, team.id, params.phaseId);
    if (!phase) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    await prisma.routineProgramPhase.delete({ where: { id: phase.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs delete phase error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
