// src/app/api/ct/scouting/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export async function GET() {
  const data = await prisma.scoutingCategory.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const { nombre } = await req.json();
  if (!nombre || typeof nombre !== "string") {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  const base = slugify(nombre);
  let slug = base || `cat-${Date.now()}`;
  // asegurar unicidad de slug
  const exists = await prisma.scoutingCategory.findUnique({ where: { slug } });
  if (exists) slug = `${base}-${Date.now().toString(36)}`;

  const max = await prisma.scoutingCategory.aggregate({ _max: { orden: true } });
  const data = await prisma.scoutingCategory.create({
    data: { nombre, slug, orden: (max._max.orden ?? 0) + 1, activa: true },
  });
  return NextResponse.json({ data }, { status: 201 });
}
