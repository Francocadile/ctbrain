// src/app/api/metrics/rpe/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseDate(d?: string) {
  if (!d) return null;
  const x = new Date(`${d}T00:00:00.000Z`);
  return Number.isNaN(x.getTime()) ? null : x;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const from = parseDate(searchParams.get("from") || undefined);
    const to = parseDate(searchParams.get("to") || undefined);

    const where: any = {};
    if (userId) where.userId = userId;
    if (from || to) {
      where.date = {};
      if (from) (where.date as any).gte = from;
      if (to) {
        const next = new Date(to);
        next.setUTCDate(next.getUTCDate() + 1);
        (where.date as any).lt = next;
      }
    }

    const rows = await prisma.rPEEntry.findMany({
      where,
      orderBy: [{ date: "asc" }],
      select: { id: true, userId: true, date: true, rpe: true, duration: true, load: true },
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * Body:
 * {
 *   userId: string,
 *   date: "YYYY-MM-DD",
 *   rpe: number (0..10),
 *   duration?: number (min)
 * }
 * Upsert por (userId, date). Calcula load si hay duration.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const userId = String(b?.userId || "").trim();
    const dateStr = String(b?.date || "").trim();
    const rpe = Number(b?.rpe);
    const duration = b?.duration == null ? null : Number(b?.duration);

    if (!userId || !dateStr || !Number.isFinite(rpe)) {
      return new NextResponse("userId, date y rpe requeridos", { status: 400 });
    }
    if (rpe < 0 || rpe > 10) {
      return new NextResponse("rpe debe ser 0..10", { status: 400 });
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return new NextResponse("date inválida", { status: 400 });
    }

    const data: any = { userId, date, rpe };
    if (Number.isFinite(duration!) && (duration as number) > 0) {
      data.duration = Math.trunc(duration as number);
      data.load = Math.trunc(rpe * (duration as number));
    }

    const row = await prisma.rPEEntry.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: data,
      select: { id: true, userId: true, date: true, rpe: true, duration: true, load: true },
    });

    return NextResponse.json(row);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
