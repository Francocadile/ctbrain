// src/app/api/ct/scouting/categories/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedFindManyArgs, scopedWhere } from "@/lib/dbScope";

// slugify sin dependencia
function slugify(input: string) {
  return (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "categoria";
}

export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req });
    const data = await prisma.scoutingCategory.findMany(
      scopedFindManyArgs(team.id, {
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      }) as any,
    );
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("multitenant scouting categories get error", err);
    return NextResponse.json({ error: err?.message ?? "Error al listar" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req });
    const { nombre } = await req.json();
    if (!nombre || typeof nombre !== "string") {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const base = slugify(nombre);
    let slug = base;
    let n = 1;
    // evitar colisión de slug
    // eslint-disable-next-line no-await-in-loop
    while (
      await prisma.scoutingCategory.findFirst({
        where: scopedWhere(team.id, { slug }) as any,
        select: { id: true },
      })
    ) {
      slug = `${base}-${n++}`;
    }

    const ordenMax = await prisma.scoutingCategory.aggregate({
      where: { teamId: team.id } as Prisma.ScoutingCategoryWhereInput,
      _max: { orden: true },
    });
    const nextOrder = (ordenMax._max?.orden ?? 0) + 1;

    const data = await prisma.scoutingCategory.create({
      data: {
        teamId: team.id,
        nombre,
        slug,
        activa: true,
        orden: nextOrder,
      } as Prisma.ScoutingCategoryCreateInput,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("multitenant scouting categories post error", err);
    return NextResponse.json({ error: err?.message ?? "Error al crear" }, { status: 500 });
  }
}
