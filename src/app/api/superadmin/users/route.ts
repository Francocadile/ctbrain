import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

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
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  // data: { name, email, password, role, teamId }
  if (!data.email || !data.password || !data.role) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  const passwordHash = await bcryptjs.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      isApproved: true,
    },
  });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  // Permite actualizar nombre, email, rol, isApproved
  const user = await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      isApproved: data.isApproved,
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
