// src/app/api/metrics/rpe/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
function clamp010(n: any): number {
  const v = Math.round(Number(n ?? 0));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

/**
 * GET /api/metrics/rpe
 * Query:
 *  - date=YYYY-MM-DD (opcional)
 *  - userId=... (opcional)
 * Sin date → últimas 30 entradas globalmente.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const userId = searchParams.get("userId") || undefined;

    const baseInclude = { user: { select: { name: true, email: true } } };

    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      const rows = await prisma.rPEEntry.findMany({
        where: { date: { gte: start, lt: end }, ...(userId ? { userId } : {}) },
        include: baseInclude,
        orderBy: [{ date: "desc" }, { id: "asc" }],
      });
      const mapped = rows.map((r) => ({
        ...r,
        userName: r.user?.name ?? r.user?.email ?? "—",
      }));
      return NextResponse.json(mapped, { headers: { "cache-control": "no-store" } });
    }

    const rows = await prisma.rPEEntry.findMany({
      include: baseInclude,
      orderBy: [{ date: "desc" }, { id: "asc" }],
      take: 30,
    });
    const mapped = rows.map((r) => ({
      ...r,
      userName: r.user?.name ?? r.user?.email ?? "—",
    }));
    return NextResponse.json(mapped, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * POST /api/metrics/rpe
 * Body: { userId: string, date: "YYYY-MM-DD", rpe: 0..10, duration?: number }
 * Upsert por (userId, date). `load = rpe × duration` si hay duración.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const userId = String(b?.userId || "").trim();
    const dateStr = String(b?.date || "").trim();
    if (!userId || !dateStr) {
      return new NextResponse("userId y date requeridos", { status: 400 });
    }
    const start = toUTCStart(dateStr);
    const rpe = clamp010(b?.rpe);
    const duration = b?.duration != null ? Math.max(0, Number(b.duration)) : null;
    const load = duration != null ? rpe * duration : null;

    const entry = await prisma.rPEEntry.upsert({
      where: { userId_date: { userId, date: start } },
      update: { rpe, duration, load },
      create: { userId, date: start, rpe, duration, load },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json(
      { ...entry, userName: entry.user?.name ?? entry.user?.email ?? "—" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
