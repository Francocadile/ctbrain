// src/app/api/metrics/wellness/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma"; // ✅ default import
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const dynamic = "force-dynamic";

const staffRoles = new Set<Role>([
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.DIRECTIVO,
]);

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return bad("UNAUTHENTICATED", 401);

  const role = session.user.role as Role | undefined;
  if (!role) return bad("FORBIDDEN", 403);

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD inclusive
  const end = searchParams.get("end");     // YYYY-MM-DD inclusive
  const player = searchParams.get("player"); // opcional: nombre o email
  const requestedTeamId = searchParams.get("teamId") || undefined;

  if (!start || !end) return bad("Parámetros requeridos: start, end (YYYY-MM-DD)");

  try {
    const where: any = { date: { gte: start, lte: end } };

    if (player) {
      where.user = {
        is: {
          OR: [
            { name:  { equals: player, mode: "insensitive" } },
            { email: { equals: player, mode: "insensitive" } },
          ],
        },
      };
    }

    if (role === Role.SUPERADMIN) {
      if (requestedTeamId) {
        where.user = {
          ...(where.user || {}),
          is: {
            ...(where.user?.is || {}),
            teams: {
              some: { teamId: requestedTeamId },
            },
          },
        };
      }
    } else if (staffRoles.has(role)) {
      const teamId = getCurrentTeamId(session);
      if (!teamId) return bad("TEAM_REQUIRED", 428);
      where.user = {
        ...(where.user || {}),
        is: {
          ...(where.user?.is || {}),
          teams: {
            some: { teamId },
          },
        },
      };
    } else {
      return bad("FORBIDDEN", 403);
    }

    const items = await prisma.wellnessEntry.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    const out = items.map((r: any) => ({
      id: r.id,
      date: r.date,
      playerKey: r.playerKey ?? null, // compat
      userId: r.userId ?? null,
      user: r.user ?? null,
      sleepQuality: Number(r.sleepQuality ?? 0),
      sleepHours: r.sleepHours != null ? Number(r.sleepHours) : null,
      fatigue: Number(r.fatigue ?? 0),
      muscleSoreness: Number(r.muscleSoreness ?? r.soreness ?? 0),
      stress: Number(r.stress ?? 0),
      mood: Number(r.mood ?? 0),
      comment: r.comment ?? r.notes ?? null,
      sdw: r.sdw ?? null,
      zScore: r.z_score_sdw ?? r.zScore ?? null,
      color: r.color_flag ?? r.color ?? null,
      overridesApplied: r.overrides_applied ?? null,
      contextTags: r.context_tags ?? null,
    }));

    return NextResponse.json({ start, end, count: out.length, items: out });
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Error consultando wellness", 500);
  }
}
