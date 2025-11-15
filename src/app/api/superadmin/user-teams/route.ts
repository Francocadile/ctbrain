import { NextRequest, NextResponse } from "next/server";
import { Role, TeamRole } from "@prisma/client";
import { hash } from "bcryptjs";
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

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
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
    const body = await readJson<{ email?: string; password?: string; name?: string; role?: string }>(req);

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    let password = typeof body.password === "string" ? body.password.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const teamRole = body.role;

    if (!email) return jsonError("email es obligatorio");
    if (!isValidEmail(email)) return jsonError("email inválido");
    if (!password) return jsonError("password es obligatorio");
    if (password.length < 6) return jsonError("password debe tener al menos 6 caracteres");
    if (!isTeamRole(teamRole)) return jsonError("role inválido");

    const existingEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingEmail) return jsonError("Ya existe un usuario con ese email", 409);

  const passwordHash = await hash(password, 10);
  const globalRoleKey = teamRole as keyof typeof Role;
  const globalRole = Role[globalRoleKey];

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: globalRole,
          isApproved: true,
        },
        select: { id: true },
      });

      const assignment = await tx.userTeam.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: teamRole,
        },
        select: userTeamSelect,
      });

      return assignment;
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
