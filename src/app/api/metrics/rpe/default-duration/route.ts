// src/app/api/metrics/rpe/default-duration/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toUTCStart(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const date = String(b?.date || "");
    const duration = Math.max(0, Number(b?.duration ?? 0));

    if (!date || !duration) {
      return new NextResponse("date y duration requeridos", { status: 400 });
    }

    const start = toUTCStart(date);
    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 1);

    const empties = await prisma.rPEEntry.findMany({
      where: {
        date: { gte: start, lt: next },
        OR: [{ duration: null }, { load: null }],
      },
    });

    let updated = 0;
    for (const row of empties) {
      const load = row.rpe * duration;
      await prisma.rPEEntry.update({
        where: { id: row.id },
        data: { duration, load },
      });
      updated++;
    }

    return NextResponse.json({ updated });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
