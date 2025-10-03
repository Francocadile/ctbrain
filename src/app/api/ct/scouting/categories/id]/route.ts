// src/app/api/ct/scouting/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  const body = await _req.json();
  const data = await prisma.scoutingCategory.update({
    where: { id: params.id },
    data: {
      nombre: typeof body.nombre === "string" ? body.nombre : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      activa: typeof body.activa === "boolean" ? body.activa : undefined,
      orden: typeof body.orden === "number" ? body.orden : undefined,
    },
  });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const count = await prisma.scoutingPlayer.count({ where: { categoriaId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "No se puede borrar: la categoría tiene jugadores. Moverlos primero." },
      { status: 400 }
    );
  }
  await prisma.scoutingCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
