

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false as const, status: 401 as const, error: "UNAUTHENTICATED" };
  }
  if (session.user.role !== "SUPERADMIN") {
    return { ok: false as const, status: 403 as const, error: "FORBIDDEN" };
  }
  return { ok: true as const, session };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const teams = await prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
    return NextResponse.json(teams);
  } catch (err) {
    console.error("[superadmin/teams] GET error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { name, adminName, adminEmail, adminPassword } = await req.json();
    const cleanName = (name || "").trim();
    const cleanAdminName = (adminName || "").trim();
    const cleanAdminEmail = (adminEmail || "").trim().toLowerCase();
    const cleanAdminPassword = (adminPassword || "").trim();
    if (!cleanName || !cleanAdminName || !cleanAdminEmail || !cleanAdminPassword) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanAdminEmail)) {
      return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
    }
    const teamExists = await prisma.team.findFirst({
      where: { name: { equals: cleanName, mode: "insensitive" } },
      select: { id: true },
    });
    if (teamExists) {
      return NextResponse.json({ error: "Ya existe un equipo con ese nombre" }, { status: 409 });
    }
    const userExists = await prisma.user.findFirst({
      where: { email: cleanAdminEmail },
      select: { id: true },
    });
    if (userExists) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: { name: cleanName },
        });
        const passwordHash = await bcrypt.hash(cleanAdminPassword, 10);
        const adminUser = await tx.user.create({
          data: {
            name: cleanAdminName,
            email: cleanAdminEmail,
            passwordHash,
            role: "ADMIN",
            isApproved: true,
          },
        });
        await tx.userTeam.create({
          data: {
            userId: adminUser.id,
            teamId: team.id,
            role: "ADMIN",
          },
        });
        return { team };
      });
    } catch (err) {
      console.error("[superadmin/teams] POST error", err);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    return NextResponse.json(result.team, { status: 201 });
  } catch (err) {
    console.error("[superadmin/teams] POST error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
