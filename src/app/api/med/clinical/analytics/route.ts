// src/app/api/med/clinical/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";

type ClinicalStatus = "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function toYMD(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function daysBetween(a: Date, b: Date) {
  const ms = endOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export async function GET(req: NextRequest) {
  // Auth (CT o ADMIN o MEDICO pueden leer analytics)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (token as any).role as string | undefined;
  const allowed = role === "CT" || role === "ADMIN" || role === "MEDICO";
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  // Por defecto: mes actual
  const now = new Date();
  const defStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = start ? startOfDay(parseYMD(start)) : startOfDay(defStart);
  const endDate = end ? endOfDay(parseYMD(end)) : endOfDay(defEnd);

  // Traemos entradas del rango (selección mínima necesaria)
  const rows = await prisma.clinicalEntry.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      userId: true,
      date: true,
      status: true,
      leaveKind: true,
      bodyPart: true,
      mechanism: true,
      severity: true,
      startDate: true,
      expectedReturn: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // Totales
  const totalEpisodes = rows.length;
  const playersAffected = new Set(rows.map((r) => r.userId)).size;

  // Conteo por estado
  const statusCounts: Record<ClinicalStatus, number> = {
    BAJA: 0,
    REINTEGRO: 0,
    LIMITADA: 0,
    ALTA: 0,
  };
  rows.forEach((r) => {
    const s = r.status as ClinicalStatus;
    if (statusCounts[s] != null) statusCounts[s] += 1;
  });

  // Top por zona (bodyPart) y mecanismo
  const bodyPartCounts = new Map<string, number>();
  const mechanismCounts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.bodyPart) bodyPartCounts.set(r.bodyPart, (bodyPartCounts.get(r.bodyPart) || 0) + 1);
    if (r.mechanism) mechanismCounts.set(r.mechanism, (mechanismCounts.get(r.mechanism) || 0) + 1);
  });
  const bodyPartTop = [...bodyPartCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  const mechanismTop = [...mechanismCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Promedio de días estimados de baja (si hay startDate + expectedReturn)
  const deltas: number[] = [];
  rows.forEach((r) => {
    if (r.startDate && r.expectedReturn) {
      deltas.push(daysBetween(r.startDate, r.expectedReturn));
    }
  });
  const avgEstimatedDays =
    deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;

  // Top jugadores por “días fuera” estimados en el rango
  // Si no hay expectedReturn, usamos endDate; si no hay startDate, usamos r.date
  const byPlayer = new Map<
    string,
    { userId: string; name: string; daysOut: number; episodes: number }
  >();
  rows.forEach((r) => {
    const name = r.user?.name || r.user?.email || r.userId;
    const sDate = r.startDate || r.date; // fallback razonable
    const eDate = r.expectedReturn || endDate;
    const days = daysBetween(sDate, eDate);
    const prev = byPlayer.get(r.userId) || { userId: r.userId, name, daysOut: 0, episodes: 0 };
    prev.daysOut += days;
    prev.episodes += 1;
    byPlayer.set(r.userId, prev);
  });
  const topPlayersByDaysOut = [...byPlayer.values()]
    .sort((a, b) => b.daysOut - a.daysOut)
    .slice(0, 10);

  // Resumen “últimos episodios” (para tablas chicas si se quiere)
  const recent = rows.slice(0, 20).map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || r.userId,
    date: toYMD(r.date),
    status: r.status,
    bodyPart: r.bodyPart,
    mechanism: r.mechanism,
    severity: r.severity,
    startDate: r.startDate ? toYMD(r.startDate) : null,
    expectedReturn: r.expectedReturn ? toYMD(r.expectedReturn) : null,
  }));

  return NextResponse.json({
    range: { start: toYMD(startDate), end: toYMD(endDate) },
    totals: {
      episodes: totalEpisodes,
      playersAffected,
      avgEstimatedDays,
      statusCounts,
    },
    bodyPartTop,
    mechanismTop,
    topPlayersByDaysOut,
    recent,
  });
}
