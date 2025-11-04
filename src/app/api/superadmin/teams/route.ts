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
  // data: { name, adminEmail }
  if (!data.name || !data.adminEmail) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  // Crear el equipo
  const team = await prisma.team.create({ data: { name: data.name } });
  // Generar contraseña aleatoria segura
  function generatePassword(length = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }
  const adminPassword = generatePassword();
  // Crear el usuario ADMIN vinculado
  const bcryptjs = require("bcryptjs");
  const adminUser = await prisma.user.create({
    data: {
      name: "ADMIN de " + data.name,
      email: data.adminEmail,
      password: await bcryptjs.hash(adminPassword, 10),
      role: "ADMIN",
      isApproved: true,
      teamId: team.id,
    },
  });
  return NextResponse.json({ team, adminUser, adminPassword });
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
  // Eliminar todos los usuarios asociados al equipo
  await prisma.user.deleteMany({ where: { teamId: id } });
  // Eliminar el equipo
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
