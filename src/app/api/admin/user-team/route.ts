// src/app/api/admin/user-team/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/user-team?teamId=...&userId=...
 * Listar asignaciones por equipo o usuario (solo SUPERADMIN)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const userId = searchParams.get("userId");
  const where: any = {};
  if (teamId) where.teamId = teamId;
  if (userId) where.userId = userId;
  const userTeams = await prisma.userTeam.findMany({
    where,
    include: { user: true, team: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(userTeams);
}

/**
 * POST /api/admin/user-team
 * Asignar usuario a equipo con rol
 * Body: { userId: string, teamId: string, role: string }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const userId = (body?.userId ?? "").toString().trim();
  const teamId = (body?.teamId ?? "").toString().trim();
  const role = (body?.role ?? "CT").toString().trim().toUpperCase();
  if (!userId || !teamId) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  const userTeam = await prisma.userTeam.upsert({
    where: { userId_teamId: { userId, teamId } },
    update: { role },
    create: { userId, teamId, role },
  });
  return NextResponse.json({ ok: true, userTeam });
}

/**
 * DELETE /api/admin/user-team?userId=...&teamId=...
 * Quitar usuario de equipo
 */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const teamId = searchParams.get("teamId");
  if (!userId || !teamId) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  await prisma.userTeam.delete({ where: { userId_teamId: { userId, teamId } } });
  return NextResponse.json({ ok: true });
}
