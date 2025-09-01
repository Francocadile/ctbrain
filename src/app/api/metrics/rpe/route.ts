// src/app/api/metrics/rpe/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- utils fechas ----------
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
function cap010(n: any): number {
  const v = Math.round(Number(n ?? 0));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}
function asInt(n: any): number | null {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? v : null;
}
function slugName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------- resolver userId por nombre si hace falta ----------
async function resolveUserId(input: {
  userId?: string;
  playerKey?: string;     // compat (si alguien lo envía)
  playerName?: string;    // nombre visible del jugador
  name?: string;          // alias
}): Promise<string> {
  const byId = String(input.userId || "").trim();
  if (byId) return byId;

  const name =
    String(input.playerKey || input.playerName || input.name || "").trim();
  if (!name) throw new Error("userId o nombre de jugador requerido");

  const existing = await prisma.user.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;

  // creamos un usuario placeholder para pruebas manuales
  const slug = slugName(name) || "jugador";
  const email = `auto+${slug}-${Date.now()}@ct.app`;
  const created = await prisma.user.create({
    data: { email, name, role: Role.JUGADOR, password: null },
    select: { id: true },
  });
  return created.id;
}

/**
 * GET /api/metrics/rpe
 * Query:
 *  - date=YYYY-MM-DD (opcional) y/o userId
 * Sin date → últimas 30 entradas globales.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const userId = searchParams.get("userId") || undefined;

    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      const rows = await prisma.rPEEntry.findMany({
        where: { date: { gte: start, lt: end }, ...(userId ? { userId } : {}) },
        orderBy: [{ date: "desc" }],
      });
      return NextResponse.json(rows);
    }

    const rows = await prisma.rPEEntry.findMany({
      orderBy: [{ date: "desc" }],
      take: 30,
    });
    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * POST /api/metrics/rpe
 * Body (dos caminos):
 *  a) { userId, date, rpe, duration? }
 *  b) { playerName | name | playerKey, date, rpe, duration? }
 *
 * Guarda único por (userId, date). Calcula load = rpe * duration si hay duración.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();

    const dateStr = String(b?.date || "").trim();
    if (!dateStr) return new NextResponse("date requerido", { status: 400 });

    const userId = await resolveUserId({
      userId: b?.userId,
      playerKey: b?.playerKey,
      playerName: b?.playerName,
      name: b?.name,
    });

    const start = toUTCStart(dateStr);
    const rpe = cap010(b?.rpe);
    const duration = asInt(b?.duration); // opcional (min)
    const load = duration != null ? rpe * duration : null;

    // upsert por (userId, date)
    const entry = await prisma.rPEEntry.upsert({
      where: { userId_date: { userId, date: start } },
      update: { rpe, duration, load },
      create: { userId, date: start, rpe, duration, load },
    });

    return NextResponse.json(entry);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
