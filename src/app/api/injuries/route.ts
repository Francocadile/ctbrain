// src/app/api/injuries/route.ts
import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || "";
    if (!date) {
      // últimas 30 por defecto, para debug
      const rows = await prisma.injuryEntry.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: [{ date: "desc" }],
        take: 30,
      });
      const mapped = rows.map((r) => ({
        ...r,
        userName: r.user?.name ?? r.user?.email ?? "—",
      }));
      return NextResponse.json(mapped);
    }
    const start = toUTCStart(date);
    const end = nextUTCDay(start);

    const rows = await prisma.injuryEntry.findMany({
      where: { date: { gte: start, lt: end } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: "desc" }],
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

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const userId = String(b?.userId || "").trim();
    const dateStr = String(b?.date || "").trim();
    if (!userId || !dateStr) {
      return new NextResponse("userId y date requeridos", { status: 400 });
    }
    const start = toUTCStart(dateStr);

    const data = {
      status: String(b?.status || "ACTIVO"),
      bodyPart: b?.bodyPart ? String(b.bodyPart) : null,
      laterality: b?.laterality ? String(b.laterality) : null,
      mechanism: b?.mechanism ? String(b.mechanism) : null,
      expectedReturn: b?.expectedReturn ? new Date(b.expectedReturn) : null,
      notes: b?.notes ? String(b.notes) : null,
    };

    const entry = await prisma.injuryEntry.upsert({
      where: { userId_date: { userId, date: start } },
      update: data,
      create: { userId, date: start, ...data },
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
