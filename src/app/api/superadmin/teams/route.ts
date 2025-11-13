
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

export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdminToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    const auth = await requireSuperAdminToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { name } = await req.json();
    const cleanName = (name || "").trim();
    if (!cleanName) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    const exists = await prisma.team.findFirst({
      where: { name: { equals: cleanName, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) return NextResponse.json({ error: "Ya existe un equipo con ese nombre" }, { status: 409 });
    const team = await prisma.team.create({ data: { name: cleanName } });
    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    console.error("[superadmin/teams] POST error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
