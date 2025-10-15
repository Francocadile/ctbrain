// src/app/api/ct/scouting/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

export async function GET() {
  try {
    const data = await prisma.scoutingCategory.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error al listar" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nombre } = await req.json();
    if (!nombre || typeof nombre !== "string") {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const base = slugify(nombre);
    let slug = base;
    let n = 1;
    // evitar colisión de slug
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.scoutingCategory.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const ordenMax = await prisma.scoutingCategory.aggregate({ _max: { orden: true } });

    const data = await prisma.scoutingCategory.create({
      data: {
        nombre,
        slug,
        activa: true,
        orden: (ordenMax._max.orden ?? 0) + 1,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error al crear" }, { status: 500 });
  }
}
