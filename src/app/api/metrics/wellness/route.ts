// src/app/api/metrics/wellness/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- util fechas ----------
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

// ---------- normalizadores ----------
function cap15(n: any): number {
  const v = Math.floor(Number(n ?? 0));
  if (!Number.isFinite(v)) return 0;
  return Math.max(1, Math.min(5, v));
}
function asFloat(n: any): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}
function slugName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------- resolvemos userId a partir de nombre (si hace falta) ----------
async function resolveUserId(input: {
  userId?: string;
  playerKey?: string;
  playerName?: string;
  name?: string;
}): Promise<string> {
  const byId = String(input.userId || "").trim();
  if (byId) return byId;

  const name =
    String(input.playerKey || input.playerName || input.name || "").trim();
  if (!name) throw new Error("userId o nombre de jugador requerido");

  // ¿existe usuario con ese name?
  const existing = await prisma.user.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;

  // crear uno “placeholder” para pruebas manuales (email único)
  const slug = slugName(name) || "jugador";
  const email = `auto+${slug}-${Date.now()}@ct.app`;
  const created = await prisma.user.create({
    data: {
      email,
      name,
      role: Role.JUGADOR,
      password: null,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * GET /api/metrics/wellness
 * Query:
 *  - date=YYYY-MM-DD (opcional) → devuelve entradas de ese día
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

    // fallback: últimas 30 entradas
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
 * Body acepta dos caminos:
 *  a) { userId, date, ... }
 *  b) { playerKey | playerName | name, date, ... }  // crea/busca User y usa su id
 *
 * Campos:
 *  sleepQuality(1..5), sleepHours?(number), fatigue(1..5),
 *  muscleSoreness(1..5) | soreness(1..5), stress(1..5), mood(1..5),
 *  comment?(string) | notes?(string)
 *
 * Unicidad: (userId, date)
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();

    const dateStr = String(b?.date || "").trim();
    if (!dateStr) return new NextResponse("date requerido", { status: 400 });

    // resolver userId (por id o por nombre)
    const userId = await resolveUserId({
      userId: b?.userId,
      playerKey: b?.playerKey,
      playerName: b?.playerName,
      name: b?.name,
    });

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

    // upsert por (userId, date)
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
