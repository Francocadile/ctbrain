// src/app/api/export/wellness/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function sum(arr: number[]) { return arr.reduce((a,b)=>a+b,0); }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD
  const end = searchParams.get("end");     // YYYY-MM-DD
  const player = searchParams.get("player"); // optional (name or email)

  if (!start || !end) {
    return NextResponse.json({ error: "Parámetros requeridos: start, end" }, { status: 400 });
  }

  const where: any = { date: { gte: start, lte: end } };
  if (player) {
    where.user = {
      is: {
        OR: [
          { name:  { equals: player, mode: "insensitive" } },
          { email: { equals: player, mode: "insensitive" } },
        ],
      },
    };
  }

  const items = await prisma.wellnessEntry.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  const rows = items.map((r) => {
    const sleepQuality = Number(r.sleepQuality ?? 0);
    const fatigue = Number(r.fatigue ?? 0);
    const muscleSoreness = Number(r.muscleSoreness ?? (r as any).soreness ?? 0);
    const stress = Number(r.stress ?? 0);
    const mood = Number(r.mood ?? 0);
    const total = sum([sleepQuality, fatigue, muscleSoreness, stress, mood]);

    return {
      Jugador: r.user?.name || r.user?.email || "—",
      Email: r.user?.email || "",
      Fecha: r.date,
      Sueño_calidad: sleepQuality,
      Horas_sueño: r.sleepHours != null ? Number(r.sleepHours) : "",
      Fatiga: fatigue,
      Dolor_muscular: muscleSoreness,
      Estrés: stress,
      Ánimo: mood,
      Total_diario: total || "",
      Comentario: (r as any).comment ?? (r as any).notes ?? "",
      Color: (r as any).color_flag ?? (r as any).color ?? "",
    };
  });

  const csv = toCsv(rows);
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="wellness_${start}_a_${end}.csv"`,
    "Cache-Control": "no-store",
  });
  return new NextResponse(csv, { status: 200, headers });
}
