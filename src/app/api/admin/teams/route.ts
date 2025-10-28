// src/app/api/admin/teams/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/teams
 * Listar todos los equipos (solo SUPERADMIN)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const teams = await prisma.team.findMany({
    include: { users: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teams);
}

/**
 * POST /api/admin/teams
 * Crear equipo (solo SUPERADMIN)
 * Body: { name: string, clubName?: string }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body?.name ?? "").toString().trim();
  const clubName = (body?.clubName ?? "").toString().trim();
  if (!name) {
    return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
  }
  const team = await prisma.team.create({
    data: { name },
  });
  return NextResponse.json({ ok: true, team });
}

/**
 * DELETE /api/admin/teams?id=teamId
 * Eliminar equipo (solo SUPERADMIN)
 */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/admin/teams
 * Editar equipo (solo SUPERADMIN)
 * Body: { id: string, name?: string, clubName?: string }
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = (body?.id ?? "").toString().trim();
  const name = (body?.name ?? "").toString().trim();
  const clubName = (body?.clubName ?? "").toString().trim();
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
    },
  });
  return NextResponse.json({ ok: true, team });
}
