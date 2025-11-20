import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routines/[id] -> detalle rutina + items
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const routine = await prisma.routine.findFirst({
      where: { id, teamId: team.id },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!routine) {
      return new NextResponse("routine not found", { status: 404 });
    }

    const data = {
      id: routine.id,
      title: routine.title,
      description: routine.description ?? null,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
      items: routine.items.map((it: any) => ({
        id: it.id,
        title: it.title,
        description: it.description ?? null,
        order: it.order,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine detail error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// PATCH /api/ct/routines/[id] -> editar { title, description }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const existing = await prisma.routine.findFirst({
      where: { id, teamId: team.id },
    });
    if (!existing) {
      return new NextResponse("routine not found", { status: 404 });
    }

    const body = await req.json();

    let title: string | undefined = undefined;
    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (!t) return new NextResponse("title requerido", { status: 400 });
      title = t;
    }

    let description: string | null | undefined = undefined;
    if (typeof body?.description === "string") {
      const d = body.description.trim();
      description = d || null;
    }

    const updated = await prisma.routine.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    const data = {
      id: updated.id,
      title: updated.title,
      description: updated.description ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routines/[id] -> borrar rutina (items en cascada)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const id = params.id;

    const existing = await prisma.routine.findFirst({
      where: { id, teamId: team.id },
    });
    if (!existing) {
      return new NextResponse("routine not found", { status: 404 });
    }

    await prisma.routine.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
