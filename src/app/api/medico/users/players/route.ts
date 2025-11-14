import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/medico/users/players
 * Requiere rol MEDICO o ADMIN.
 * Devuelve SOLO usuarios con role = JUGADOR.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role as Role | undefined;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (!role || (role !== Role.MEDICO && role !== Role.ADMIN)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const teamId = getCurrentTeamId(session);
    if (!teamId) {
      return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
    }

    const list = await prisma.user.findMany({
      where: {
        role: Role.JUGADOR,
        teams: { some: { teamId } },
      },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (list.length > 0) {
      return NextResponse.json(list, {
        headers: { "cache-control": "no-store", "x-source": "enum" },
      });
    }

    const raw = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null }>
   >`SELECT u.id, u.name, u.email
     FROM "User" u
     INNER JOIN "UserTeam" ut ON ut."userId" = u.id
     WHERE u.role IN ('JUGADOR','PLAYER')
      AND ut."teamId" = ${teamId}
     ORDER BY u.name NULLS FIRST, u.email NULLS FIRST`;

    return NextResponse.json(raw, {
      headers: { "cache-control": "no-store", "x-source": "raw" },
    });
  } catch (err) {
    console.error("GET /api/medico/users/players failed:", err);
    return new NextResponse(JSON.stringify([]), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-error": "1",
      },
    });
  }
}
