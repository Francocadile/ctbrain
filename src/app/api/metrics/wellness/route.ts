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
 * - Devuelve lista (orden: date desc, user asc)
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
 * Body: { userId, date(YYYY-MM-DD), sleep, soreness, stress, mood, notes? }
 * - Upsert por (userId, date)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "");
    const date = String(body?.date || "");
    if (!userId || !date) {
      return new NextResponse("userId y date requeridos", { status: 400 });
    }

    const dateIso = toUTCStart(date);
    const sleep = Math.max(1, Math.min(10, Number(body?.sleep ?? 0)));
    const soreness = Math.max(1, Math.min(10, Number(body?.soreness ?? 0)));
    const stress = Math.max(1, Math.min(10, Number(body?.stress ?? 0)));
    const mood = Math.max(1, Math.min(10, Number(body?.mood ?? 0)));
    const notes = (body?.notes ?? null) as string | null;

    const data = await prisma.wellnessEntry.upsert({
      where: { userId_date: { userId, date: dateIso } },
      update: { sleep, soreness, stress, mood, notes },
      create: { userId, date: dateIso, sleep, soreness, stress, mood, notes },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
