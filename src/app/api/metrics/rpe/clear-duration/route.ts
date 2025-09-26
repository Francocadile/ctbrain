// src/app/api/metrics/rpe/clear-duration/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

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
    if (!date) return new NextResponse("date requerido", { status: 400 });

    const start = toUTCStart(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const res = await prisma.rPEEntry.updateMany({
      where: { date: { gte: start, lt: end } },
      data: { duration: null, load: null },
    });

    return NextResponse.json({ updated: res.count });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
