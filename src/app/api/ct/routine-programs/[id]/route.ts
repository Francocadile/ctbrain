import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function getProgramOr404(req: Request, id: string) {
  const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
  const p: any = prisma;

  const program = await p.routineProgram.findFirst({
    where: { id, teamId: team.id },
    select: {
      id: true,
      teamId: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!program) return { prisma, team, program: null };
  return { prisma, team, program };
}

// GET /api/ct/routine-programs/[id] -> detalle + days
export async function GET(req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    const { prisma, team, program } = await getProgramOr404(req, id);
    const p: any = prisma;
    if (!program) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const days = await p.routineProgramDay.findMany({
      where: { programId: program.id },
      orderBy: { dayIndex: "asc" },
      select: {
        id: true,
        dayIndex: true,
        label: true,
        routineId: true,
        routine: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({
      data: {
        ...program,
        description: program.description ?? null,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
        days: days.map((d: any) => ({
          id: d.id,
          dayIndex: d.dayIndex,
          label: d.label ?? null,
          routineId: d.routineId,
          routineTitle: d.routine?.title ?? null,
        })),
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine programs detail error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// PATCH /api/ct/routine-programs/[id] -> editar title/description
export async function PATCH(req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    assertCsrf(req);
    const { prisma, team, program } = await getProgramOr404(req, id);
  const p: any = prisma;
    if (!program) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json().catch(() => null);

    const rawTitle = (body as any)?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : undefined;

    const rawDescription = (body as any)?.description;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() || null : undefined;

    const updated = await p.routineProgram.update({
      where: { id: program.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine programs patch error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routine-programs/[id] -> hard delete
export async function DELETE(req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    assertCsrf(req);
    const { prisma, team, program } = await getProgramOr404(req, id);
  const p: any = prisma;
    if (!program) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await p.routineProgram.delete({ where: { id: program.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine programs delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
