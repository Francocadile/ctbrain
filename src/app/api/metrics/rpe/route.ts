// src/app/api/metrics/rpe/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toUTCStart(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

/**
 * GET /api/metrics/rpe?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=...&sessionId=...
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId") || undefined;
    const sessionId = url.searchParams.get("sessionId") || undefined;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = toUTCStart(from);
      if (to) {
        const end = toUTCStart(to);
        end.setUTCDate(end.getUTCDate() + 1);
        where.date.lt = end;
      }
    }
    if (userId) where.userId = userId;
    if (sessionId) where.sessionId = sessionId;

    const rows = await prisma.rPEEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { userId: "asc" }],
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * POST /api/metrics/rpe
 * Body: { userId, date(YYYY-MM-DD), rpe(0-10), duration(min)? , sessionId? }
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
    const rpe = Math.max(0, Math.min(10, Number(body?.rpe ?? 0)));
    const duration = body?.duration != null && body?.duration !== ""
      ? Math.max(0, Number(body?.duration))
      : null;
    const sessionId = body?.sessionId ? String(body?.sessionId) : null;
    const load = duration != null ? rpe * duration : null;

    const data = await prisma.rPEEntry.create({
      data: { userId, date: dateIso, rpe, duration, sessionId, load },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
