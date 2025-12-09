import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  const teamId =
    session?.user?.currentTeamId ??
    (Array.isArray(session?.user?.teamIds) ? session?.user?.teamIds[0] : null);

  if (!teamId) {
    return NextResponse.json(null, { status: 200 });
  }

  const today = new Date();

  const report = await prisma.rivalReport.findFirst({
    where: {
      teamId,
      matchDate: {
        gte: today,
      },
    },
    orderBy: {
      matchDate: "asc",
    },
  });

  return NextResponse.json(report);
}
