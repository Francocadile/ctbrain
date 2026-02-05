import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// GET /api/ct/routine-programs/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const program = await prisma.routineProgram.findFirst({
      where: { id: params.id, teamId: team.id },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        phases: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            order: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { routines: true } },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, program });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine-programs detail error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}

// PATCH /api/ct/routine-programs/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = (await req.json().catch(() => ({}))) as any;
    const data: any = {};

    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (!t) return NextResponse.json({ ok: false, error: "title inválido" }, { status: 400 });
      data.title = t;
    }

    if (body?.description === null) data.description = null;
    else if (typeof body?.description === "string") data.description = body.description.trim() || null;

    const updated = await prisma.routineProgram.updateMany({
      where: { id: params.id, teamId: team.id },
      data,
    });

    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs patch error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routine-programs/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const deleted = await prisma.routineProgram.deleteMany({
      where: { id: params.id, teamId: team.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine-programs delete error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
