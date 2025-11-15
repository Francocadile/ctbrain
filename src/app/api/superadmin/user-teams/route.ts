import { NextRequest, NextResponse } from "next/server";
import { Role, TeamRole } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";

const userTeamSelect = {
  id: true,
  role: true,
  userId: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
} as const;

const TEAM_ROLE_VALUES = Object.values(TeamRole);

function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && TEAM_ROLE_VALUES.includes(value as TeamRole);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const userTeams = await prisma.userTeam.findMany({
      where: { teamId: team.id },
      select: userTeamSelect,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: userTeams });
  } catch (err) {
    console.error("superadmin user-team error", err);
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const body = await readJson<{ userId?: string; role?: string }>(req);
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const role = body.role;

    if (!userId) return jsonError("userId es obligatorio");
    if (!isTeamRole(role)) return jsonError("role inválido");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return jsonError("Usuario no encontrado", 404);

    const existing = await prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId: team.id } },
      select: { id: true },
    });
    if (existing) return jsonError("El usuario ya pertenece a este equipo", 409);

    const created = await prisma.userTeam.create({
      data: {
        userId,
        teamId: team.id,
        role,
      },
      select: userTeamSelect,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("superadmin user-team error", err);
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const body = await readJson<{ id?: string; role?: string }>(req);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const role = body.role;

    if (!id) return jsonError("id es obligatorio");
    if (!isTeamRole(role)) return jsonError("role inválido");

    const existing = await prisma.userTeam.findFirst({
      where: { id, teamId: team.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Asignación no encontrada", 404);

    const updated = await prisma.userTeam.update({
      where: { id },
      data: { role },
      select: userTeamSelect,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("superadmin user-team error", err);
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.SUPERADMIN] });
    const body = await readJson<{ id?: string }>(req);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return jsonError("id es obligatorio");

    const existing = await prisma.userTeam.findFirst({
      where: { id, teamId: team.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Asignación no encontrada", 404);

    await prisma.userTeam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("superadmin user-team error", err);
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
