// src/app/api/ct/scouting/categories/[id]/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const data = await prisma.scoutingCategory.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as any,
    });
    if (!data) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("multitenant scouting category get error", err);
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const body = await req.json();
    const dataPatch: Prisma.ScoutingCategoryUpdateInput = {
      nombre: typeof body.nombre === "string" ? body.nombre : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      activa: typeof body.activa === "boolean" ? body.activa : undefined,
      orden: typeof body.orden === "number" ? body.orden : undefined,
    };

    const updated = await prisma.scoutingCategory.updateMany({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.ScoutingCategoryWhereInput,
      data: dataPatch,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const data = await prisma.scoutingCategory.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as any,
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("multitenant scouting category put error", err);
    return NextResponse.json({ error: err?.message ?? "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const exists = await prisma.scoutingCategory.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as any,
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    // no permitir borrar si tiene jugadores asignados
    const countPlayers = await prisma.scoutingPlayer.count({
      where: scopedWhere(team.id, { categoriaId: params.id }) as any,
    });
    if (countPlayers > 0) {
      return NextResponse.json(
        { error: "No se puede borrar: la categoría tiene jugadores. Moverlos primero." },
        { status: 400 }
      );
    }

    const res = await prisma.scoutingCategory.deleteMany({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.ScoutingCategoryWhereInput,
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("multitenant scouting category delete error", err);
    return NextResponse.json({ error: err?.message ?? "Error al borrar" }, { status: 500 });
  }
}
