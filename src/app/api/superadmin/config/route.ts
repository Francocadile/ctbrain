import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

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
  let config = await prisma.globalConfig.findFirst();
  if (!config) config = await prisma.globalConfig.create({ data: { systemName: "CTBrain", logoUrl: "", mainColor: "#000" } });
  return NextResponse.json(config);
}

export async function PUT(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const data = await req.json();
  let config = await prisma.globalConfig.findFirst();
  if (!config) config = await prisma.globalConfig.create({ data });
  else config = await prisma.globalConfig.update({ where: { id: config.id }, data });
  return NextResponse.json(config);
}
