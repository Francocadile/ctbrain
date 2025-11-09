// src/app/api/ct/scouting/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    // Obtener teamId del usuario autenticado
    const session = await getServerSession(authOptions);
    const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
    const teamId = user?.teamId;
    if (!teamId) return NextResponse.json({ data: [] });
    const data = await prisma.scoutingCategory.findMany({
      where: { teamId },
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

    // Obtener teamId del usuario autenticado
    const session = await getServerSession(authOptions);
    const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
    const teamId = user?.teamId;
    if (!teamId) return NextResponse.json({ error: "Sin teamId" }, { status: 400 });
    const base = slugify(nombre);
    let slug = base;
    let n = 1;
    // evitar colisión de slug
    while (await prisma.scoutingCategory.findUnique({ where: { slug, teamId } })) {
      slug = `${base}-${n++}`;
    }
    const ordenMax = await prisma.scoutingCategory.aggregate({ where: { teamId }, _max: { orden: true } });
    const data = await prisma.scoutingCategory.create({
      data: {
        nombre,
        slug,
        activa: true,
        orden: (ordenMax._max.orden ?? 0) + 1,
        teamId,
      },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error al crear" }, { status: 500 });
  }
}
