// src/app/api/metrics/wellness/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function resolveUserId(input: { userId?: string; playerKey?: string }) {
  const byId = String(input.userId || "").trim();
  if (byId) return byId;

  const key = String(input.playerKey || "").trim();
  if (!key) return null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: key, mode: "insensitive" } },
        { email: { equals: key, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** GET /api/metrics/wellness
 * Query:
 *  - date=YYYY-MM-DD (opcional)
 *  - userId=... | playerKey=... (opcional)
 * Sin date → últimas 30 entradas globales.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const qpUserId = searchParams.get("userId") || undefined;
    const playerKey = searchParams.get("playerKey") || undefined;

    let userId = qpUserId;
    if (!userId && playerKey) {
      userId = await resolveUserId({ playerKey });
      if (!userId) return NextResponse.json([], { status: 200 });
    }

    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      const rows = await prisma.wellnessEntry.findMany({
        where: { date: { gte: start, lt: end }, ...(userId ? { userId } : {}) },
        orderBy: [{ date: "desc" }],
      });
      return NextResponse.json(rows);
    }

    const rows = await prisma.wellnessEntry.findMany({
      orderBy: [{ date: "desc" }],
      take: 30,
    });
    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/** POST /api/metrics/wellness
 * Body admite userId o playerKey.
 * Regla: **solo un envío por jugador y día** (409 si ya existe).
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const dateStr = String(b?.date || "").trim();
    if (!dateStr) return new NextResponse("date requerido", { status: 400 });

    const userId = await resolveUserId({ userId: b?.userId, playerKey: b?.playerKey });
    if (!userId) return new NextResponse("Jugador no identificado", { status: 400 });

    const start = toUTCStart(dateStr);
    const existing = await prisma.wellnessEntry.findUnique({
      where: { userId_date: { userId, date: start } },
    });
    if (existing) {
      // No se edita desde jugador: una sola vez por día
      return new NextResponse("Ya enviaste wellness hoy", { status: 409 });
    }

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

    const entry = await prisma.wellnessEntry.create({
      data: {
        userId,
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
    });

    return NextResponse.json(entry);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
