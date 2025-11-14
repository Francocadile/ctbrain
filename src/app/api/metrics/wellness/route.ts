// src/app/api/metrics/wellness/route.ts
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
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

function nextUTCDay(d: Date) {
  const n = new Date(d);
  n.setUTCDate(n.getUTCDate() + 1);
  return n;
}

function cap15(n: any): number {
  const v = Math.floor(Number(n ?? 0));
  if (!Number.isFinite(v)) return 0;
  return Math.max(1, Math.min(5, v));
}

function asFloat(n: any): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const role = session.user.role as Role | undefined;
    if (!role) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const requestedUserId = searchParams.get("userId") || undefined;
    const requestedTeamId = searchParams.get("teamId") || undefined;

    const where: Prisma.WellnessEntryWhereInput = {};

    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      where.date = { gte: start, lt: end };
    }

    let relationFilter: Prisma.UserRelationFilter | undefined;

    if (role === Role.JUGADOR) {
      where.userId = session.user.id;
    } else if (role === Role.SUPERADMIN) {
      if (requestedUserId) {
        where.userId = requestedUserId;
      }
      if (requestedTeamId) {
        relationFilter = {
          is: {
            teams: {
              some: { teamId: requestedTeamId },
            },
          },
        };
      }
    } else if (staffRoles.has(role)) {
      const teamId = getCurrentTeamId(session);
      if (!teamId) {
        return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
      }
      relationFilter = {
        is: {
          teams: {
            some: { teamId },
          },
        },
      };
      if (requestedUserId) {
        where.userId = requestedUserId;
      }
    } else {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (relationFilter) {
      where.user = relationFilter;
    }

    const rows = await prisma.wellnessEntry.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: "desc" }],
      ...(date ? {} : { take: 30 }),
    });
    const mapped = rows.map((r) => ({
      ...r,
      userName: r.user?.name ?? r.user?.email ?? "—",
    }));
    return NextResponse.json(mapped);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("UNAUTHENTICATED", { status: 401 });
    }

    const role = session.user.role as Role | undefined;
    if (role !== Role.JUGADOR) {
      return new NextResponse("Solo jugadores pueden enviar wellness", { status: 403 });
    }

    const teamId = getCurrentTeamId(session);
    if (!teamId) {
      return new NextResponse("Seleccioná un equipo antes de enviar", { status: 428 });
    }

    const membership = await prisma.userTeam.findFirst({
      where: { userId: session.user.id, teamId },
      select: { id: true },
    });
    if (!membership) {
      return new NextResponse("No pertenecés a este equipo", { status: 403 });
    }

    const b = await req.json();
    const dateStr = String(b?.date || "").trim();
    if (!dateStr) {
      return new NextResponse("La fecha es requerida", { status: 400 });
    }

    const start = toUTCStart(dateStr);
    const sleepQuality = cap15(b?.sleepQuality);
    const fatigue = cap15(b?.fatigue);
    const muscleSoreness = cap15(
      b?.muscleSoreness !== undefined ? b?.muscleSoreness : b?.soreness
    );
    const stress = cap15(b?.stress);
    const mood = cap15(b?.mood);
    const sleepHours = asFloat(b?.sleepHours);
    const comment: string | null =
      (b?.comment ?? b?.notes ?? null) !== null
        ? String(b?.comment ?? b?.notes ?? "").trim() || null
        : null;

    const total = sleepQuality + fatigue + muscleSoreness + stress + mood;

    const entry = await prisma.wellnessEntry.upsert({
      where: { userId_date: { userId: session.user.id, date: start } },
      update: {
        sleepQuality,
        sleepHours,
        fatigue,
        muscleSoreness,
        stress,
        mood,
        comment,
        total,
      },
      create: {
        userId: session.user.id,
        date: start,
        sleepQuality,
        sleepHours,
        fatigue,
        muscleSoreness,
        stress,
        mood,
        comment,
        total,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      ...entry,
      userName: entry.user?.name ?? entry.user?.email ?? "—",
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
