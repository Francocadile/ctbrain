import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// PATCH /api/ct/routines/items/[itemId] -> actualizar RoutineItem
export async function PATCH(req: Request, { params }: { params: { itemId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const itemId = params.itemId;

    const existing = await prisma.routineItem.findFirst({
      where: { id: itemId },
      include: {
        routine: true,
      },
    });

    if (!existing || existing.routine.teamId !== team.id) {
      return new NextResponse("item not found", { status: 404 });
    }

    const body = await req.json();

    const data: any = {};

    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (!t) return new NextResponse("title requerido", { status: 400 });
      data.title = t;
    }

    if (typeof body?.description === "string") {
      const d = body.description.trim();
      data.description = d || null;
    }

    if (typeof body?.order === "number") {
      data.order = body.order;
    }

    const updated = await prisma.routineItem.update({
      where: { id: existing.id },
      data,
    });

    const resp = {
      id: updated.id,
      title: updated.title,
      description: updated.description ?? null,
      order: updated.order,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({ data: resp });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine item update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routines/items/[itemId] -> borrar RoutineItem
export async function DELETE(req: Request, { params }: { params: { itemId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const itemId = params.itemId;

    const existing = await prisma.routineItem.findFirst({
      where: { id: itemId },
      include: {
        routine: true,
      },
    });

    if (!existing || existing.routine.teamId !== team.id) {
      return new NextResponse("item not found", { status: 404 });
    }

    await prisma.routineItem.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine item delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
