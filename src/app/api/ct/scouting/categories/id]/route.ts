// src/app/api/ct/scouting/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "No se pudo actualizar la categoría" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // ¿Tiene jugadores?
    const countPlayers = await prisma.scoutingPlayer.count({
      where: { categoriaId: params.id },
    });
    if (countPlayers > 0) {
      return NextResponse.json(
        { error: "No se puede borrar: la categoría tiene jugadores. Moverlos primero." },
        { status: 400 }
      );
    }

    // Borrado seguro (evita throw si no existe)
    const res = await prisma.scoutingCategory.deleteMany({
      where: { id: params.id },
    });

    if (res.count === 0) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al borrar la categoría" },
      { status: 500 }
    );
  }
}
