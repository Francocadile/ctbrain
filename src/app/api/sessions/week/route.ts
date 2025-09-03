// src/app/api/sessions/week/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ===== helpers de fecha (UTC) ===== */
function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayUTC(base: Date) {
  // normalizamos a 00:00 UTC y retrocedemos hasta lunes
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = d.getUTCDay() || 7; // 1..7
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const start = url.searchParams.get("start"); // YYYY-MM-DD (opcional)

    const base = start ? new Date(`${start}T00:00:00.000Z`) : new Date();
    const weekStart = getMondayUTC(base);        // lunes 00:00 UTC
    const nextMonday = addDaysUTC(weekStart, 7); // **fin EXCLUSIVO**
    const sunday = addDaysUTC(weekStart, 6);     // solo informativo

    // Traemos TODO lo que cae dentro de [weekStart, nextMonday)
    const rows = await prisma.session.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: nextMonday, // <- clave: excluye el lunes siguiente, incluye TODO el domingo
        },
      },
      orderBy: { date: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Inicializamos Lun..Dom
    const days: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      days[toYYYYMMDDUTC(addDaysUTC(weekStart, i))] = [];
    }

    for (const r of rows) {
      const ymd = toYYYYMMDDUTC(r.date);
      (days[ymd] ||= []).push({
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
      weekEnd: toYYYYMMDDUTC(sunday), // informativo
      days,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
