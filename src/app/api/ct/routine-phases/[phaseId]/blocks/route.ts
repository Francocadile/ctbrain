import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routine-phases/[phaseId]/blocks -> bloques (RoutineProgramBlock) de una fase
export async function GET(req: Request, { params }: { params: { phaseId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const phaseId = params.phaseId;

    // Validación de pertenencia al team (vía program)
    const phase = await prisma.routineProgramPhase.findFirst({
      where: { id: phaseId, program: { teamId: team.id } },
      select: { id: true },
    });
    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const rows = await prisma.routineProgramBlock.findMany({
      where: { phaseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        key: true,
        title: true,
        order: true,
        durationWeeks: true,
      },
    });

    const data = rows.map((b: any) => ({
      id: b.id,
      key: b.key,
      title: b.title ?? null,
      order: b.order,
      durationWeeks: b.durationWeeks,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine-phase blocks list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
