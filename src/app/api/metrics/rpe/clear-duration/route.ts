// src/app/api/metrics/rpe/clear-duration/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const staffRoles = new Set<Role>([
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.DIRECTIVO,
]);

function toUTCStart(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("UNAUTHENTICATED", { status: 401 });
    }

    const role = session.user.role as Role | undefined;
    if (!role) {
      return new NextResponse("FORBIDDEN", { status: 403 });
    }

    const b = await req.json();
    const date = String(b?.date || "");
    if (!date) return new NextResponse("date requerido", { status: 400 });

    let teamId: string | null = null;
    if (role === Role.SUPERADMIN) {
      teamId = typeof b?.teamId === "string" && b.teamId.trim().length > 0 ? b.teamId.trim() : null;
    } else if (staffRoles.has(role)) {
      teamId = getCurrentTeamId(session);
    } else {
      return new NextResponse("FORBIDDEN", { status: 403 });
    }

    if (!teamId) {
      return new NextResponse("TEAM_REQUIRED", { status: 428 });
    }

    const start = toUTCStart(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const rows = await prisma.rPEEntry.findMany({
      where: {
        date: { gte: start, lt: end },
        user: {
          teams: {
            some: { teamId },
          },
        },
      },
      select: { id: true },
    });

    if (!rows.length) {
      return NextResponse.json({ updated: 0 });
    }

    const res = await prisma.rPEEntry.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { duration: null, load: null },
    });

    return NextResponse.json({ updated: res.count });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
