// src/app/api/metrics/rpe/default-duration/route.ts
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
    const b = await req.json();
    const date = String(b?.date || "");
    const duration = Math.max(0, Number(b?.duration ?? 0));
    if (!date || !duration) {
      return new NextResponse("date y duration requeridos", { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("UNAUTHENTICATED", { status: 401 });
    }

    const role = session.user.role as Role | undefined;
    if (!role) {
      return new NextResponse("FORBIDDEN", { status: 403 });
    }
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
    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 1);

    const empties = await prisma.rPEEntry.findMany({
      where: {
        date: { gte: start, lt: next },
        OR: [{ duration: null }, { load: null }],
        user: {
          teams: {
            some: { teamId },
          },
        },
      },
      select: { id: true, rpe: true },
    });

    let updated = 0;
    for (const row of empties) {
      const load = row.rpe * duration;
      await prisma.rPEEntry.update({
        where: { id: row.id },
        data: { duration, load },
      });
      updated++;
    }

    return NextResponse.json({ updated });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
