import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// POST /api/ct/programs/[programId]/weeks -> crear semana { weekNumber?, label? }
export async function POST(req: Request, { params }: { params: { programId: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const programId = params.programId;

    const program = await prisma.program.findFirst({
      where: { id: programId, teamId: team.id },
      select: { id: true },
    });

    if (!program) return new NextResponse("program not found", { status: 404 });

    const body = await req.json();

    // Week number: default = max + 1
    let weekNumber: number | null = typeof body?.weekNumber === "number" ? body.weekNumber : null;
    if (!weekNumber || !Number.isFinite(weekNumber) || weekNumber < 1) {
      const last = await prisma.programWeek.findFirst({
        where: { programId: program.id, teamId: team.id },
        orderBy: { weekNumber: "desc" },
        select: { weekNumber: true },
      });
      weekNumber = (last?.weekNumber ?? 0) + 1;
    }

    const rawLabel = body?.label;
    const label = typeof rawLabel === "string" ? rawLabel.trim() || null : null;

    const row = await prisma.programWeek.create({
      data: {
        programId: program.id,
        teamId: team.id,
        weekNumber,
        label,
      },
    });

    const data = {
      id: row.id,
      programId: row.programId,
      teamId: row.teamId,
      weekNumber: row.weekNumber,
      label: row.label ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    // Prisma unique constraint
    if (String(error?.code) === "P2002") {
      return NextResponse.json({ error: "weekNumber ya existe en este programa" }, { status: 409 });
    }
    console.error("ct program week create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
