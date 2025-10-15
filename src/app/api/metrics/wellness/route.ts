// src/app/api/metrics/wellness/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    const userId = searchParams.get("userId") || undefined;

    const { getServerSession } = await import("next-auth");
    const sessionObj = await getServerSession();
    const teamId = (sessionObj as any)?.user?.teamId as string | undefined;
    if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (date) {
      const start = toUTCStart(date);
      const end = nextUTCDay(start);
      const rows = await prisma.wellnessEntry.findMany({
        where: {
          teamId,
          date: { gte: start, lt: end },
          ...(userId ? { userId } : {}),
        },
        include: { user: { select: { name: true, email: true } } },
        orderBy: [{ date: "desc" }],
      });
      const mapped = rows.map((r) => ({
        ...r,
        userName: r.user?.name ?? r.user?.email ?? "—",
      }));
      return NextResponse.json(mapped);
    }

    const rows = await prisma.wellnessEntry.findMany({
      where: { teamId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: "desc" }],
      take: 30,
    });
    const mapped = rows.map((r) => ({
      ...r,
      userName: r.user?.name ?? r.user?.email ?? "—",
    }));
    return NextResponse.json(mapped);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const userId = String(b?.userId || "").trim();
    const dateStr = String(b?.date || "").trim();
    if (!userId || !dateStr) {
      return new NextResponse("userId y date requeridos", { status: 400 });
    }

    const start = toUTCStart(dateStr);
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

    const { getServerSession } = await import("next-auth");
    const sessionObj = await getServerSession();
    const teamId = (sessionObj as any)?.user?.teamId as string | undefined;
    if (!teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        teamId,
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
        teamId,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      ...entry,
      userName: entry.user?.name ?? entry.user?.email ?? "—",
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
