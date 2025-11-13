import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const secret = process.env.NEXTAUTH_SECRET;

async function requireSuperAdminToken(req: Request) {
  const token = await getToken({ req, secret });
  if (!token || !token.sub) return { error: "No autorizado", status: 401 };
  if (token.role !== "SUPERADMIN") return { error: "Prohibido", status: 403 };
  return { token };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireSuperAdminToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });
    if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    return NextResponse.json(team);
  } catch (err) {
    console.error("[superadmin/teams/:id] GET error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireSuperAdminToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { name } = await req.json();
    const cleanName = (name || "").trim();
    if (!cleanName) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    const exists = await prisma.team.findFirst({
      where: {
        name: { equals: cleanName, mode: "insensitive" },
        NOT: { id: params.id },
      },
      select: { id: true },
    });
    if (exists) return NextResponse.json({ error: "Ya existe un equipo con ese nombre" }, { status: 409 });
    const team = await prisma.team.update({
      where: { id: params.id },
      data: { name: cleanName },
    });
    return NextResponse.json(team);
  } catch (err) {
    console.error("[superadmin/teams/:id] PUT error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireSuperAdminToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    await prisma.team.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[superadmin/teams/:id] DELETE error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
