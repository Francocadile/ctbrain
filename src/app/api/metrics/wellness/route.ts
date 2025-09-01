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

  // Busco por name o por email (insensitive)
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

/**
 * GET /api/metrics/wellness
 * Query:
 *  - date=YYYY-MM-DD (opcional) → devuelve entradas de ese día (todas o filtradas por userId)
 *  - userId=... (opcional)
 * Sin date → últimas 30 entradas (global).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const userId = searchParams.get("userId") || undefined;

    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      const rows = await prisma.wellnessEntry.findMany({
        where: {
          date: { gte: start, lt: end },
          ...(userId ? { userId } : {}),
        },
        orderBy: [{ date: "desc" }],
      });
      return NextResponse.json(rows);
    }

    // fallback: últimas 30
    const rows = await prisma.wellnessEntry.findMany({
      orderBy: [{ date: "desc" }],
      take: 30,
    });
    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * POST /api/metrics/wellness
 * Body:
 *  {
 *    // cualquiera de estos dos:
 *    userId?: string,
 *    playerKey?: string,  // nombre o email (lo que manda el jugador)
 *
 *    date: "YYYY-MM-DD",
 *    sleepQuality: 1..5,
 *    sleepHours?: number,
 *    fatigue: 1..5,
 *    muscleSoreness?: 1..5, // alias soreness
 *    soreness?: 1..5,
 *    stress: 1..5,
 *    mood: 1..5,
 *    comment?: string,      // alias notes
 *    notes?: string
 *  }
 * Unicidad: (userId, date)
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();

    const dateStr = String(b?.date || "").trim();
    if (!dateStr) return new NextResponse("date requerido", { status: 400 });

    const userId = await resolveUserId({ userId: b?.userId, playerKey: b?.playerKey });
    if (!userId) return new NextResponse("Jugador no identificado", { status: 400 });

    const start = toUTCStart(dateStr);

    // normalización y límites 1..5
    const sleepQuality = cap15(b?.sleepQuality);
    const fatigue = cap15(b?.fatigue);
    const muscleSoreness = cap15(
      b?.muscleSoreness !== undefined ? b?.muscleSoreness : b?.soreness
    );
    const stress = cap15(b?.stress);
    const mood = cap15(b?.mood);

    // opcionales
    const sleepHours = asFloat(b?.sleepHours);
    const comment: string | null =
      (b?.comment ?? b?.notes ?? null) !== null
        ? String(b?.comment ?? b?.notes ?? "").trim() || null
        : null;

    // total (sin horas ni comentario): 5 ítems
    const total = sleepQuality + fatigue + muscleSoreness + stress + mood;

    const entry = await prisma.wellnessEntry.upsert({
      where: { userId_date: { userId, date: start } },
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
