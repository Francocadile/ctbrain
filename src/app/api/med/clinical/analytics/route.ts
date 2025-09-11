// src/app/api/med/clinical/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { ClinicalStatus, LeaveKind } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * GET /api/med/clinical/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Permisos: MEDICO, CT, ADMIN
 * Default: últimos 30 días.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "CT", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");

  let to = parseYMD(toStr) ?? new Date();
  let from = parseYMD(fromStr) ?? addDays(to, -30);

  from = startOfDay(from);
  to = startOfDay(addDays(to, 1)); // [from, to)

  // base filter
  const where = { date: { gte: from, lt: to } } as const;

  // 1) conteos por status
  const all = await prisma.clinicalEntry.findMany({
    where,
    select: {
      status: true,
      leaveKind: true,
      bodyPart: true,
      mechanism: true,
      severity: true,
      diagnosis: true,
      illSystem: true,
      illSymptoms: true,
      daysMax: true,
      daysMin: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  });

  const total = all.length;
  const byStatus: Record<ClinicalStatus, number> = {
    BAJA: 0,
    REINTEGRO: 0,
    LIMITADA: 0,
    ALTA: 0,
  };
  for (const r of all) byStatus[r.status]++;

  // 2) zonas más frecuentes (solo lesión)
  const zones = new Map<string, number>();
  // 3) mecanismos (lesión)
  const mechs = new Map<string, number>();
  // 4) severidad (lesión)
  const sev = new Map<string, number>();
  // 5) diagnósticos (lesión)
  const dx = new Map<string, number>();
  // 6) sistema afectado (enfermedad)
  const systems = new Map<string, number>();
  // 7) promedio días estimados (min==max según UI)
  const daysArr: number[] = [];
  // 8) top jugadores por días estimados acumulados
  const byPlayer = new Map<string, { name: string; days: number }>();

  for (const r of all) {
    // promedio días
    const d = (r.daysMax ?? r.daysMin) ?? null;
    if (typeof d === "number" && d >= 0) daysArr.push(d);

    // por jugador
    if (!byPlayer.has(r.userId)) {
      byPlayer.set(r.userId, {
        name: r.user?.name || r.user?.email || r.userId,
        days: 0,
      });
    }
    if (typeof d === "number" && d >= 0) {
      byPlayer.get(r.userId)!.days += d;
    }

    if (r.leaveKind === LeaveKind.LESION) {
      if (r.bodyPart) zones.set(r.bodyPart, (zones.get(r.bodyPart) || 0) + 1);
      if (r.mechanism)
        mechs.set(r.mechanism, (mechs.get(r.mechanism) || 0) + 1);
      if (r.severity)
        sev.set(r.severity, (sev.get(r.severity) || 0) + 1);
      if (r.diagnosis) dx.set(r.diagnosis, (dx.get(r.diagnosis) || 0) + 1);
    } else if (r.leaveKind === LeaveKind.ENFERMEDAD) {
      if (r.illSystem)
        systems.set(r.illSystem, (systems.get(r.illSystem) || 0) + 1);
    }
  }

  const avgDays =
    daysArr.length > 0
      ? Math.round(
          (daysArr.reduce((a, b) => a + b, 0) / daysArr.length) * 10
        ) / 10
      : 0;

  const topPlayers = Array.from(byPlayer.entries())
    .map(([userId, v]) => ({ userId, userName: v.name, days: v.days }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  const toPairs = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

  const payload = {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
      days: Math.ceil((+to - +from) / 86400000),
    },
    total,
    byStatus,
    zones: toPairs(zones),
    mechanisms: toPairs(mechs),
    severities: toPairs(sev),
    diagnoses: toPairs(dx),
    systems: toPairs(systems),
    avgEstimatedDays: avgDays,
    topPlayersByEstimatedDays: topPlayers,
  };

  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
