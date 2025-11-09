import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Utilidad para chequear rol SUPERADMIN
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
  const teams = await prisma.team.findMany();
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  const team = await prisma.team.create({ data });
  return NextResponse.json(team);
}

export async function PUT(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  const team = await prisma.team.update({ where: { id: data.id }, data });
  return NextResponse.json(team);
}

export async function DELETE(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
