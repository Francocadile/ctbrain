import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";
import { Role } from "@prisma/client";

// Listado y guardado de informes de rival para el equipo actual.
// GET: lectura para staff ampliado (CT, ADMIN, MEDICO, DIRECTIVO, SUPERADMIN).
// POST: escritura limitada a CT/ADMIN/SUPERADMIN.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const role = session.user.role as Role | undefined;
  const allowedReaders = new Set<Role>([
    Role.ADMIN,
    Role.CT,
    Role.MEDICO,
    Role.DIRECTIVO,
    Role.SUPERADMIN,
  ]);
  if (!role || !allowedReaders.has(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json([], { status: 200 });
  }

  const reports = await prisma.rivalReport.findMany({
    where: { teamId },
    orderBy: { matchDate: "asc" },
  });

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const role = session.user.role as Role | undefined;
  const allowedWriters = new Set<Role>([Role.ADMIN, Role.CT, Role.SUPERADMIN]);
  if (!role || !allowedWriters.has(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
  }

  const data = await req.json();

  const report = await prisma.rivalReport.upsert({
    where: { id: data.id ?? "___new___" },
    update: {
      matchDate: new Date(data.matchDate),
      rivalName: data.rivalName,
      competition: data.competition,
      notes: data.notes,
      videos: data.videos ?? [],
    },
    create: {
      teamId,
      matchDate: new Date(data.matchDate),
      rivalName: data.rivalName,
      competition: data.competition,
      notes: data.notes,
      videos: data.videos ?? [],
    },
  });

  return NextResponse.json(report);
}
