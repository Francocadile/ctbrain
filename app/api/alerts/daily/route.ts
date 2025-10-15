// src/app/api/alerts/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ========= utils ========= */
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function mean(a: number[]) { return a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0; }
function sdSample(a: number[]) {
  const n = a.length; if (n < 2) return 0;
  const m = mean(a);
  const v = a.reduce((acc,v)=>acc+(v-m)*(v-m),0)/(n-1);
  return Math.sqrt(v);
}
function computeSDW(r: any) {
  const vals = [
    Number(r.sleepQuality ?? 0),
    Number(r.fatigue ?? 0),
    Number(r.muscleSoreness ?? r.soreness ?? 0),
    Number(r.stress ?? 0),
    Number(r.mood ?? 0),
  ].filter(v => v > 0);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function zColor(z: number | null): "green"|"yellow"|"red" {
  if (z === null) return "yellow";
  if (z >= -0.5) return "green";
  if (z >= -1.0) return "yellow";
  return "red";
}
function applyOverrides(base: "green"|"yellow"|"red", r: any) {
  let c = base;
  const sh = r.sleepHours ?? null;
  if (sh !== null && sh < 4) c = c === "green" ? "yellow" : c;
  if (Number(r.muscleSoreness ?? r.soreness ?? 0) <= 2) c = "red";
  if (Number(r.stress ?? 0) <= 2) c = c === "green" ? "yellow" : c;
  return c;
}
function resolveName(x: { user?: { name?: string|null; email?: string|null }, userName?: string|null, playerKey?: string|null }) {
  return x.user?.name || x.user?.email || x.userName || x.playerKey || "Jugador";
}
function srpeFrom(r: any): number {
  const au = r.load ?? r.srpe ?? (r.duration != null ? Number(r.rpe ?? 0) * Number(r.duration) : null);
  return au != null ? Math.round(Number(au)) : 0;
}

/* ========= reglas/sugerencias ========= */
function buildReasonsAndSuggest(opts: {
  sdw: number, baseMean: number | null, z: number | null, color: "green"|"yellow"|"red",
  sleepHours: number | null, soreness: number, stress: number, srpePrev: number,
  ydayColor?: "green"|"yellow"|"red" | null
}) {
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let severity: "CRITICAL" | "WARN" | "OK" = "OK";

  const { sdw, baseMean, z, color, sleepHours, soreness, stress, srpePrev, ydayColor } = opts;
  const dropVsBase = baseMean ? (sdw - baseMean) / baseMean : null; // negativo si cayó

  // CRÍTICOS
  if (color === "red" && dropVsBase !== null && dropVsBase <= -0.20) {
    reasons.push("SDW en rojo y caída ≥20% vs baseline");
    severity = "CRITICAL";
  }
  if (soreness <= 2) {
    reasons.push("Dolor muscular ≤2");
    severity = "CRITICAL";
  }
  if ((sleepHours !== null && sleepHours < 4) && srpePrev > 900) {
    reasons.push("Sueño <4h + sRPE alto ayer");
    severity = "CRITICAL";
  }
  if (ydayColor === "red" && color === "red") {
    reasons.push("2 días consecutivos en rojo");
    severity = "CRITICAL";
  }

  // AMARILLOS
  if (severity === "OK") {
    if (z !== null && z < -0.5 && z >= -1.0) {
      reasons.push("Descenso moderado (Z entre -1.0 y -0.5)");
      severity = "WARN";
    }
    if (sleepHours !== null && sleepHours >= 4 && sleepHours < 5) {
      reasons.push("Sueño 4–5h");
      severity = "WARN";
    }
    if (stress >= 2 && stress <= 3) {
      reasons.push("Estrés 2–3");
      severity = "WARN";
    }
  }

  // SUGERENCIAS (según causa dominante)
  if (severity !== "OK") {
    if (soreness <= 2) {
      suggestions.push("Screening con fisio; reducir excéntricos/altas velocidades; priorizar isométricos.");
    } else if (sleepHours !== null && sleepHours < 4) {
      suggestions.push("Reducir volumen 20–30%; +20’ de recovery (movilidad + respiración).");
    } else if (stress <= 2) {
      suggestions.push("Micro-ajuste de volumen; educación de sueño/recuperación.");
    } else {
      suggestions.push("Ajustar carga del día (menor volumen/intensidad) y monitorear.");
    }
  }

  return { severity, reasons, suggestions };
}

/* ========= handler ========= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || toYMD(new Date()); // YYYY-MM-DD
  const yday = toYMD(addDays(new Date(date), -1));
  const startBase = toYMD(addDays(new Date(date), -21)); // 21 días rolling

  try {
    // Wellness de HOY
    const today = await prisma.wellnessEntry.findMany({
      where: { date },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: "asc" },
    });

    if (today.length === 0) {
      return NextResponse.json({ date, count: 0, items: [] });
    }

    const userIds = today.map(r => r.userId).filter(Boolean);

    // Baseline (21d previos) y Ayer (para consecutivos)
    const prev21 = await prisma.wellnessEntry.findMany({
      where: { date: { gte: startBase, lt: date }, userId: { in: userIds as string[] } },
      orderBy: [{ userId: "asc" }, { date: "asc" }],
    });
    const ydayRows = await prisma.wellnessEntry.findMany({
      where: { date: yday, userId: { in: userIds as string[] } },
    });
    const ydayMap = new Map<string, any>();
    for (const r of ydayRows) ydayMap.set(r.userId, r);

    // sRPE de AYER
    const rpeYday = await prisma.rPEEntry.findMany({
      where: { date: yday, userId: { in: userIds as string[] } },
    });
    const rpeMap = new Map<string, number>();
    for (const r of rpeYday) rpeMap.set(r.userId, srpeFrom(r));

    // baseline por usuario (SDW)
    const baseMap = new Map<string, { mean: number, sd: number, n: number }>();
    for (const uid of userIds) {
      const arr = prev21.filter(r => r.userId === uid).map(r => computeSDW(r));
      const arrClean = arr.filter(v => v > 0);
      baseMap.set(uid as string, { mean: mean(arrClean), sd: sdSample(arrClean), n: arrClean.length });
    }

    // construir alertas
    const items = today.map((r: any) => {
      const uid = r.userId as string;
      const nm = resolveName(r);
      const sdw = computeSDW(r);

      const base = baseMap.get(uid);
      const z = base && base.n >= 7 && base.sd > 0 ? (sdw - base.mean)/base.sd : null;
      const baseColor = zColor(z);
      const color = applyOverrides(baseColor, r);
      const srpePrev = rpeMap.get(uid) || 0;

      // color de ayer (para consecutivos)
      let ydayColor: "green"|"yellow"|"red"|null = null;
      const y = ydayMap.get(uid);
      if (y) {
        const ysdw = computeSDW(y);
        const ybase = baseMap.get(uid);
        const yz = ybase && ybase.n >= 7 && ybase.sd > 0 ? (ysdw - ybase.mean)/ybase.sd : null;
        ydayColor = applyOverrides(zColor(yz), y);
      }

      const { severity, reasons, suggestions } = buildReasonsAndSuggest({
        sdw,
        baseMean: base?.mean ?? null,
        z,
        color,
        sleepHours: r.sleepHours != null ? Number(r.sleepHours) : null,
        soreness: Number(r.muscleSoreness ?? r.soreness ?? 0),
        stress: Number(r.stress ?? 0),
        srpePrev,
        ydayColor,
      });

      return {
        userId: uid,
        name: nm,
        date,
        sdw: Number(sdw.toFixed(2)),
        baselineMean: base?.mean ? Number(base.mean.toFixed(2)) : null,
        z: z !== null ? Number(z.toFixed(2)) : null,
        color,
        srpePrev,
        severity,
        reasons,
        suggestions,
      };
    });

    // ordenar por severidad y luego por Z asc (más negativo primero)
    const order = { CRITICAL: 0, WARN: 1, OK: 2 } as const;
    items.sort((a, b) => {
      const s = order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order];
      if (s !== 0) return s;
      const za = a.z ?? 0, zb = b.z ?? 0;
      return za - zb;
    });

    return NextResponse.json({ date, count: items.length, items });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error generando alertas" }, { status: 500 });
  }
}
