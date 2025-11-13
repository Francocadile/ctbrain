import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, Role, TeamRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "SUPERADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const users = await prisma.user.findMany({
    include: { teams: true },
  });
  // Map teamId for each user (first team or null)
  const mapped = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    teamId: u.teams[0]?.teamId || null,
  }));
  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  if (!data.email || !data.password) return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
  const passwordHash = await hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role as Role,
      passwordHash,
      isApproved: true,
      teams: data.teamId && data.role !== "SUPERADMIN" ? {
  create: [{ team: { connect: { id: data.teamId } }, role: data.role as TeamRole }],
      } : undefined,
    },
  });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role as Role,
      teams: data.teamId ? {
        upsert: {
          where: { userId_teamId: { userId: data.id, teamId: data.teamId } },
          update: { role: data.role as TeamRole },
          create: { teamId: data.teamId, role: data.role as TeamRole },
        },
      } : undefined,
    },
  });
  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
