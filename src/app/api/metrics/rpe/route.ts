// src/app/api/metrics/rpe/route.ts
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

function clamp010(n: any): number {
  const v = Math.round(Number(n ?? 0));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

/**
 * GET /api/metrics/rpe
 * Query:
 * - date=YYYY-MM-DD (opcional) → devuelve entradas de ese día
 * - userId=... (opcional)
 * - session=N (opcional)
 * Sin date → últimas 30 entradas (global).
 * Devuelve cada fila con userName para CT.
 */
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
    const sessionIndex = searchParams.get("session")
      ? Number(searchParams.get("session"))
      : undefined;

    const where: Prisma.RPEEntryWhereInput = {};

    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      where.date = { gte: start, lt: end };
    }

    if (sessionIndex) {
      where.session = sessionIndex;
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

    const rows = await prisma.rPEEntry.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: "desc" }, { session: "asc" }],
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

/**
 * POST /api/metrics/rpe
 * Body:
 * {
 *   userId: string,
 *   date: "YYYY-MM-DD",
 *   rpe: 0..10,
 *   duration?: number // opcional (min)
 *   session?: number  // opcional, default = 1
 * }
 * Unicidad: (userId, date, session). Recalcula load si hay duration.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("UNAUTHENTICATED", { status: 401 });
    }

    const role = session.user.role as Role | undefined;
    if (role !== Role.JUGADOR) {
      return new NextResponse("Solo jugadores pueden enviar RPE", { status: 403 });
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
  const sessionIndex = Number.isInteger(b?.session) ? Number(b.session) : 1;

    if (!dateStr) {
      return new NextResponse("La fecha es requerida", { status: 400 });
    }
    const start = toUTCStart(dateStr);
    const rpe = clamp010(b?.rpe);
    const duration =
      b?.duration != null ? Math.max(0, Number(b.duration)) : null;
    const load = duration != null ? rpe * duration : null;

    const entry = await prisma.rPEEntry.upsert({
      where: { userId_date_session: { userId: session.user.id, date: start, session: sessionIndex } },
      update: { rpe, duration, load },
      create: { userId: session.user.id, date: start, session: sessionIndex, rpe, duration, load },
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

