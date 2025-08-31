// src/app/api/metrics/wellness/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toUTCStart(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

/**
 * GET /api/metrics/wellness?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=...
 * Devuelve filas (orden date desc, user asc)
 */
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
      if (to) {
        const end = toUTCStart(to);
        end.setUTCDate(end.getUTCDate() + 1); // exclusivo
        where.date.lt = end;
      }
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

/**
 * POST /api/metrics/wellness
 * Body:
 * {
 *   userId, date(YYYY-MM-DD),
 *   sleepQuality(1-5), sleepHours(number),
 *   fatigue(1-5), soreness(1-5), stress(1-5), mood(1-5),
 *   notes?
 * }
 * Upsert por (userId,date)
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const userId = String(b?.userId || "");
    const date = String(b?.date || "");
    if (!userId || !date) {
      return new NextResponse("userId y date requeridos", { status: 400 });
    }

    const dateIso = toUTCStart(date);
    const clamp15 = (v: any) => Math.max(1, Math.min(5, Number(v ?? 0)));

    const sleepQuality = clamp15(b?.sleepQuality);
    const sleepHours = Number(b?.sleepHours ?? 0);
    const fatigue = clamp15(b?.fatigue);
    const soreness = clamp15(b?.soreness);
    const stress = clamp15(b?.stress);
    const mood = clamp15(b?.mood);
    const notes = (b?.notes ?? null) as string | null;

    const data = await prisma.wellnessEntry.upsert({
      where: { userId_date: { userId, date: dateIso } },
      update: { sleepQuality, sleepHours, fatigue, soreness, stress, mood, notes },
      create: { userId, date: dateIso, sleepQuality, sleepHours, fatigue, soreness, stress, mood, notes },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
