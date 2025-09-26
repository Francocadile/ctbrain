import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

function toUTCStart(ymd: string) { return new Date(`${ymd}T00:00:00.000Z`); }
function nextUTCDay(d: Date) { const n = new Date(d); n.setUTCDate(n.getUTCDate() + 1); return n; }

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const dateStr = String(b?.date || "").trim();
    const duration = Math.max(0, Number(b?.duration ?? 0));
    if (!dateStr || !duration) return new NextResponse("date y duration requeridos", { status: 400 });

    const start = toUTCStart(dateStr);
    const end = nextUTCDay(start);

    const rows = await prisma.rPEEntry.findMany({ where: { date: { gte: start, lt: end } } });

    const updates = rows
      .filter((r) => r.duration == null || Number(r.duration) === 0)
      .map((r) =>
        prisma.rPEEntry.update({
          where: { id: r.id },
          data: {
            duration,
            load: (r.rpe ?? 0) * duration,
          },
        })
      );

    await prisma.$transaction(updates);
    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
