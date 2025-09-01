// src/app/api/metrics/rpe/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ymdToUTC(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const dateStr = String(b?.date || "");
    const rpe = Math.max(0, Number(b?.rpe ?? 0));
    const playerKey = String(b?.playerKey || "").trim(); // nombre visible del jugador
    if (!dateStr || !playerKey || rpe <= 0) {
      return new NextResponse("date, playerKey y rpe requeridos", { status: 400 });
    }

    const start = ymdToUTC(dateStr);
    const next = new Date(start); next.setUTCDate(next.getUTCDate() + 1);

    // upsert por (playerKey + date)
    const existing = await prisma.rPEEntry.findFirst({
      where: { playerKey, date: { gte: start, lt: next } },
    });

    if (!existing) {
      await prisma.rPEEntry.create({
        data: { playerKey, date: start, rpe, duration: null, load: null },
      });
    } else {
      await prisma.rPEEntry.update({
        where: { id: existing.id },
        data: { rpe, load: existing.duration ? existing.duration * rpe : null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
