// src/app/api/med/clinical/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* Utils */
function toYMD(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function parseYMD(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [_, yy, mm, dd] = m;
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function nextDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

/**
 * GET /api/med/clinical/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Roles: MEDICO, CT, ADMIN
 * Devuelve métricas agregadas para tableros.
 */
export async function GET(req: NextRequest) {
  // Auth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "CT", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rango de fechas (default: últimos 60 días)
  const { searchParams } = req.nextUrl;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const today = startOfDay(new Date());
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 60);

  const from = startOfDay(parseYMD(fromStr) ?? defaultFrom);
  const to = startOfDay(parseYMD(toStr) ?? today);
  const toExclusive = nextDay(to);

  // Traemos todas las columnas y sólo incluimos user (sin select de scalars para evitar errores de tipos)
  const rows = await prisma.clinicalEntry.findMany({
    where: { date: { gte: from, lt: toExclusive } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });

  // Helpers de agregación
  const countBy = <K extends string>(arr: any[], key: (r: any) => K | null | undefined) => {
    const m = new Map<K, number>();
    for (const r of arr) {
      const k = key(r);
      if (!k) continue;
      m.set(k, (m.get(k as K) ?? 0) + 1);
    }
    return Object.fromEntries(m.entries());
  };

  // Top-N por conteo
  const topN = (obj: Record<string, number>, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ key: k, count: v }));

  // Aproximación de “días de baja” para un registro:
  // 1) daysMax || daysMin
  // 2) sino (expectedReturn - startDate) en días
  // 3) sino 0
  const daysOutFor = (r: any): number => {
    const dmax = (r as any).daysMax ?? null;
    const dmin = (r as any).daysMin ?? null;
    if (Number.isFinite(dmax)) return Number(dmax);
    if (Number.isFinite(dmin)) return Number(dmin);
    if (r.startDate && r.expectedReturn) {
      const a = startOfDay(new Date(r.startDate));
      const b = startOfDay(new Date(r.expectedReturn));
      const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
      return Number.isFinite(diff) ? Math.max(0, diff) : 0;
    }
    return 0;
  };

  // Métricas básicas
  const total = rows.length;

  const byStatus = countBy(rows, (r) => r.status);
  const byKind = countBy(rows, (r) => r.leaveKind || undefined);
  const byMechanism = countBy(rows, (r) => r.mechanism || undefined);
  const bySeverity = countBy(rows, (r) => r.severity || undefined);

  const byBodyPartAll = countBy(rows, (r) => (r.bodyPart ? r.bodyPart.trim().toLowerCase() : undefined));
  const byBodyPart = topN(byBodyPartAll, 10);

  // Promedios
  const daysSeries = rows.map(daysOutFor).filter((n) => Number.isFinite(n) && n > 0);
  const avgDaysOut = daysSeries.length
    ? Math.round((daysSeries.reduce((a, b) => a + b, 0) / daysSeries.length) * 10) / 10
    : 0;

  // Jugadores con más días de baja acumulados en el rango
  const byPlayerDays = new Map<string, { userId: string; userName: string; days: number }>();
  for (const r of rows) {
    const k = r.userId;
    const prev = byPlayerDays.get(k) ?? {
      userId: r.userId,
      userName: r.user?.name || r.user?.email || "—",
      days: 0,
    };
    prev.days += daysOutFor(r);
    byPlayerDays.set(k, prev);
  }
  const topPlayers = Array.from(byPlayerDays.values())
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  // Tendencia simple por fecha (conteo de episodios por día)
  const byDateAll = countBy(rows, (r) => toYMD(r.date));
  const trend = Object.entries(byDateAll)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // Respuesta
  return NextResponse.json({
    range: { from: toYMD(from), to: toYMD(to) },
    totals: {
      episodes: total,
      avgDaysOut,
    },
    breakdowns: {
      byStatus,
      byKind,
      bySeverity,
      byMechanism,
      topBodyParts: byBodyPart,
      topPlayers, // [{ userId, userName, days }]
      trendDaily: trend, // [{ date, count }]
    },
  }, { headers: { "cache-control": "no-store" } });
}
