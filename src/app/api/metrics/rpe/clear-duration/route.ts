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
    if (!dateStr) return new NextResponse("date requerido", { status: 400 });

    const start = toUTCStart(dateStr);
    const end = nextUTCDay(start);

    const rows = await prisma.rPEEntry.findMany({ where: { date: { gte: start, lt: end } } });
    const updates = rows.map((r) =>
      prisma.rPEEntry.update({
        where: { id: r.id },
        data: { duration: null, load: null },
      })
    );
    await prisma.$transaction(updates);
    return NextResponse.json({ ok: true, cleared: updates.length });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
