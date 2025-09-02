// src/app/api/metrics/wellness/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD inclusive
  const end = searchParams.get("end"); // YYYY-MM-DD inclusive
  const player = searchParams.get("player"); // opcional: nombre o email

  if (!start || !end) return bad("Parámetros requeridos: start, end (YYYY-MM-DD)");

  try {
    // where SIN playerKey (no existe en tu WellnessEntry)
    const where: any = { date: { gte: start, lte: end } };

    if (player) {
      // filtro por relación user (name/email, case-insensitive)
      where.user = {
        is: {
          OR: [
            { name: { equals: player, mode: "insensitive" } },
            { email: { equals: player, mode: "insensitive" } },
          ],
        },
      };
    }

    const items = await prisma.wellnessEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    const out = items.map((r: any) => ({
      id: r.id,
      date: r.date,
      // compat con el front (si algún día agregás playerKey, no rompe)
      playerKey: r.playerKey ?? null,
      userId: r.userId ?? null,
      user: r.user ?? null,
      sleepQuality: Number(r.sleepQuality ?? 0),
      sleepHours: r.sleepHours != null ? Number(r.sleepHours) : null,
      fatigue: Number(r.fatigue ?? 0),
      muscleSoreness: Number(r.muscleSoreness ?? r.soreness ?? 0),
      stress: Number(r.stress ?? 0),
      mood: Number(r.mood ?? 0),
      comment: r.comment ?? r.notes ?? null,
      // campos derivados si los hubieras persistido (no obligatorios)
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
