import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

// Próximo informe de rival para el equipo actual.
// Requiere sesión; cualquier rol asociado al equipo puede leerlo.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const teamId = getCurrentTeamId(session);
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
