// src/app/api/sessions/week/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayUTC(base: Date) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = d.getUTCDay() || 7; // 1..7
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const start = url.searchParams.get("start"); // YYYY-MM-DD (opcional)

    const base = start ? new Date(`${start}T00:00:00.000Z`) : new Date();
    const weekStart = getMondayUTC(base);                   // lunes 00:00 UTC
    const weekEndInclusive = new Date(weekStart);           // domingo 00:00 UTC (+6 días)
    weekEndInclusive.setUTCDate(weekEndInclusive.getUTCDate() + 6);
    const endExclusive = new Date(weekStart);               // lunes siguiente (fin exclusivo)
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);

    // Traemos TODO lo que cae dentro de [weekStart, nextMonday)
    const rows = await prisma.session.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: endExclusive,
        },
      },
      orderBy: { date: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Inicializamos el mapa Lun..Dom
    const days: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      days[toYYYYMMDDUTC(d)] = [];
    }

    for (const r of rows) {
      const ymd = toYYYYMMDDUTC(r.date);
      if (!days[ymd]) days[ymd] = [];
      days[ymd].push({
        id: r.id,
        title: r.title,
        description: r.description,
        date: r.date.toISOString(),
        type: r.type,
        createdAt: r.createdAt?.toISOString?.() ?? null,
        updatedAt: r.updatedAt?.toISOString?.() ?? null,
        createdBy: r.createdBy ?? null,
        user: r.user,
      });
    }

    return NextResponse.json({
      weekStart: toYYYYMMDDUTC(weekStart),
      weekEnd: toYYYYMMDDUTC(weekEndInclusive),
      days,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
