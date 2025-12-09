import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  const teamId =
    session?.user?.currentTeamId ??
    (Array.isArray(session?.user?.teamIds) ? session?.user?.teamIds[0] : null);

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
  const session = await auth();

  const teamId =
    session?.user?.currentTeamId ??
    (Array.isArray(session?.user?.teamIds) ? session?.user?.teamIds[0] : null);

  if (!session?.user || !teamId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
