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
  const end = searchParams.get("end");     // YYYY-MM-DD inclusive
  const player = searchParams.get("player"); // opcional: nombre/clave

  if (!start || !end) return bad("Parámetros requeridos: start, end (YYYY-MM-DD)");

  try {
    const items = await prisma.wellnessEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(player
          ? { OR: [{ playerKey: player }, { user: { name: player } }] }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    // respuesta amigable (compat con vistas actuales)
    const out = items.map((r) => ({
      id: r.id,
      date: r.date,
      playerKey: (r as any).playerKey ?? null,
      userId: (r as any).userId ?? null,
      user: r.user,
      sleepQuality: r.sleepQuality,
      sleepHours: r.sleepHours,
      fatigue: r.fatigue,
      muscleSoreness: (r as any).muscleSoreness ?? (r as any).soreness ?? null,
      stress: r.stress,
      mood: r.mood,
      comment: (r as any).comment ?? (r as any).notes ?? null,
    }));

    return NextResponse.json({ start, end, count: out.length, items: out });
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Error consultando wellness", 500);
  }
}
