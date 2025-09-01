// src/app/api/metrics/rpe/route.ts
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

/** GET /api/metrics/rpe
 * Query: date=YYYY-MM-DD (opcional), userId=... | playerKey=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const qpUserId = searchParams.get("userId") || undefined;
    const playerKey = searchParams.get("playerKey") || undefined;

    // <-- Fix de tipos: puede ser string | null | undefined
    let userId: string | null | undefined = qpUserId;
    if (!userId && playerKey) {
      userId = await resolveUserId({ playerKey });
      if (!userId) return NextResponse.json([], { status: 200 });
    }

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

/** POST /api/metrics/rpe
 * Body admite userId o playerKey.
 * Reglas:
 *  - Si viene desde jugador (sin duration) y ya existe → **409 (una vez por día)**.
 *  - Si viene con duration (acción del CT) → se permite actualizar rpe/duration/load.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();

    const dateStr = String(b?.date || "").trim();
    const rpe = Math.max(0, Math.min(10, Number(b?.rpe ?? 0)));
    if (!dateStr || !Number.isFinite(rpe)) {
      return new NextResponse("date y rpe requeridos", { status: 400 });
    }

    const userId = await resolveUserId({ userId: b?.userId, playerKey: b?.playerKey });
    if (!userId) return new NextResponse("Jugador no identificado", { status: 400 });

    const start = toUTCStart(dateStr);
    const end = nextUTCDay(start);

    const existing = await prisma.rPEEntry.findFirst({
      where: { userId, date: { gte: start, lt: end } },
    });

    const cameWithDuration =
      b?.duration !== undefined && b?.duration !== null && Number.isFinite(Number(b?.duration));

    if (existing && !cameWithDuration) {
      return new NextResponse("Ya enviaste RPE hoy", { status: 409 });
    }

    let duration: number | null = cameWithDuration ? Math.max(0, Number(b?.duration)) : null;

    if (!existing) {
      const load = duration != null ? Math.round(rpe * duration) : null;
      const created = await prisma.rPEEntry.create({
        data: {
          userId,
          date: start,
          rpe: Math.round(rpe),
          duration: duration ?? null,
          load,
        },
      });
      return NextResponse.json(created);
    }

    if (duration == null) duration = existing.duration ?? null;
    const load = duration != null ? Math.round(rpe * duration) : null;

    const updated = await prisma.rPEEntry.update({
      where: { id: existing.id },
      data: {
        rpe: Math.round(rpe),
        duration,
        load,
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
