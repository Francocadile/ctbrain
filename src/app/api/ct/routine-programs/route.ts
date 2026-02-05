import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

function defaultTitleForToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `Programa ${yyyy}-${mm}-${dd}`;
}

// GET /api/ct/routine-programs
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const programs = await prisma.routineProgram.findMany({
      where: { teamId: team.id },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, programs });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine-programs list error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/routine-programs (create + seed phase 1)
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = (await req.json().catch(() => ({}))) as any;
    const title = (typeof body?.title === "string" && body.title.trim()) ? body.title.trim() : defaultTitleForToday();
    const description = (typeof body?.description === "string" && body.description.trim()) ? body.description.trim() : null;

    const created = await prisma.$transaction(async (tx: any) => {
      const program = await tx.routineProgram.create({
        data: {
          teamId: team.id,
          title,
          description,
        },
        select: { id: true, title: true, description: true, updatedAt: true },
      });

      await tx.routineProgramPhase.create({
        data: {
          programId: program.id,
          title: "Fase 1",
          order: 0,
        },
        select: { id: true },
      });

      return program;
    });

    return NextResponse.json({ ok: true, program: created }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs create error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
