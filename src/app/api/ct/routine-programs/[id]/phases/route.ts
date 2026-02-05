import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// POST /api/ct/routine-programs/[id]/phases
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const program = await prisma.routineProgram.findFirst({
      where: { id: params.id, teamId: team.id },
      select: { id: true, phases: { select: { order: true } } },
    });

    if (!program) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const existingCount = Array.isArray(program.phases) ? program.phases.length : 0;
    const maxOrder = (program.phases || []).reduce((m: number, p: any) => Math.max(m, Number(p.order) || 0), -1);

    const title = (typeof body?.title === "string" && body.title.trim()) ? body.title.trim() : `Fase ${existingCount + 1}`;
    const order = maxOrder + 1;

    const created = await prisma.routineProgramPhase.create({
      data: {
        programId: program.id,
        title,
        order,
      },
      select: {
        id: true,
        title: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, phase: created }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs create phase error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
