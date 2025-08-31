// src/app/api/metrics/wellness/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toUTCStart(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

// GET /api/metrics/wellness?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId") || undefined;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = toUTCStart(from);
      if (to) { const end = toUTCStart(to); end.setUTCDate(end.getUTCDate() + 1); where.date.lt = end; }
    }
    if (userId) where.userId = userId;

    const rows = await prisma.wellnessEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { userId: "asc" }],
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// POST (lo envía el jugador) — upsert por (userId, date)
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const userId = String(b?.userId || "");
    const date = String(b?.date || "");
    if (!userId || !date) return new NextResponse("userId y date requeridos", { status: 400 });

    const d = toUTCStart(date);
    const cap15 = (v: any) => Math.max(1, Math.min(5, Number(v ?? 0)));

    const data = await prisma.wellnessEntry.upsert({
      where: { userId_date: { userId, date: d } },
      update: {
        sleepQuality: cap15(b?.sleepQuality),
        sleepHours: Number(b?.sleepHours ?? 0),
        fatigue: cap15(b?.fatigue),
        soreness: cap15(b?.soreness),
        stress: cap15(b?.stress),
        mood: cap15(b?.mood),
        notes: (b?.notes ?? null) as string | null,
      },
      create: {
        userId,
        date: d,
        sleepQuality: cap15(b?.sleepQuality),
        sleepHours: Number(b?.sleepHours ?? 0),
        fatigue: cap15(b?.fatigue),
        soreness: cap15(b?.soreness),
        stress: cap15(b?.stress),
        mood: cap15(b?.mood),
        notes: (b?.notes ?? null) as string | null,
      },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
