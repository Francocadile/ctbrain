import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// PATCH /api/ct/routines/blocks/[blockId] -> actualizar RoutineBlock
export async function PATCH(req: Request, { params }: { params: { blockId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const blockId = params.blockId;

    const existing = await prisma.routineBlock.findFirst({
      where: { id: blockId },
      include: {
        routine: true,
      },
    });

    if (!existing || existing.routine.teamId !== team.id) {
      return new NextResponse("block not found", { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (typeof body?.name === "string") {
      const n = body.name.trim();
      if (!n) return new NextResponse("name requerido", { status: 400 });
      data.name = n;
    }

    if (typeof body?.description === "string") {
      const d = body.description.trim();
      data.description = d || null;
    }

    if (typeof body?.order === "number") {
      data.order = body.order;
    }

    if (typeof body?.type === "string") {
      const t = body.type.trim();
      if (t === "WARMUP" || t === "MAIN" || t === "COOLDOWN" || t === "ACCESSORY") {
        data.type = t;
      } else if (t === "" || t === "null") {
        data.type = null;
      } else {
        return new NextResponse("type inválido", { status: 400 });
      }
    }

    const updated = await (prisma as any).routineBlock.update({
      where: { id: existing.id },
      data,
    });

    const resp = {
      id: updated.id,
      routineId: updated.routineId,
      name: updated.name,
      order: updated.order,
      description: updated.description ?? null,
      type: updated.type ?? null,
    };

    return NextResponse.json({ data: resp });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine block update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// DELETE /api/ct/routines/blocks/[blockId] -> borrar RoutineBlock
export async function DELETE(req: Request, { params }: { params: { blockId: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const blockId = params.blockId;

    const existing = await prisma.routineBlock.findFirst({
      where: { id: blockId },
      include: {
        routine: true,
      },
    });

    if (!existing || existing.routine.teamId !== team.id) {
      return new NextResponse("block not found", { status: 404 });
    }

    // Por ahora dejamos que los items queden con blockId = null si la FK está configurada así;
    // si en el futuro cambiamos a onDelete: Cascade, esto seguirá siendo válido.
    await prisma.routineBlock.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine block delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
