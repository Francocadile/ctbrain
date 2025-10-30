// src/app/api/ct/rivales/[id]/import/csv/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

type RecentRow = {
  date?: string;         // ISO o texto
  opponent?: string;
  comp?: string;
  homeAway?: string;     // H/A/N
  gf?: number;
  ga?: number;
  possession?: number;   // opcional si viene en CSV
};

type RivalStats = {
  totals?: {
    gf?: number;
    ga?: number;
    possession?: number;
  };
  recent?: RecentRow[];
};

// Helpers seguros para JSON desconocido
function asObj<T = Record<string, any>>(x: unknown): T {
  return typeof x === "object" && x !== null ? (x as T) : ({} as T);
}
function toNum(n: any): number | undefined {
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}
function normKeyMap(row: Record<string, any>) {
  const map: Record<string, string> = {};
  for (const k of Object.keys(row)) map[k.toLowerCase()] = k;
  return (wanted: string) => map[wanted.toLowerCase()];
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return new NextResponse("archivo CSV requerido (file)", { status: 400 });
    }

    const text = await file.text();

    // Carga dinámica de PapaParse (sin genéricos)
    const Papa = (await import("papaparse")).default;
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    }) as unknown as {
      data: Record<string, any>[];
      errors?: any[];
    };

    if (parsed.errors?.length) {
      return NextResponse.json(
        { errors: parsed.errors.slice(0, 3) },
        { status: 400 }
      );
    }

    // Normalizamos filas
    const rowsIn = Array.isArray(parsed.data) ? parsed.data : [];
    const recent: RecentRow[] = [];

    for (const raw of rowsIn) {
      if (!raw || typeof raw !== "object") continue;
      const key = normKeyMap(raw);

      const dateKey = key("date") || key("fecha");
      const oppKey = key("opponent") || key("rival") || key("opponent_name");
      const compKey = key("comp") || key("competition") || key("torneo");
      const locKey = key("homeaway") || key("loc") || key("home_away");
      const gfKey = key("gf") || key("goalsfor") || key("goles_favor");
      const gaKey = key("ga") || key("goalsagainst") || key("goles_contra");
      const posKey =
        key("possession") || key("poss") || key("posesion") || key("pos");

      const r: RecentRow = {
        date: dateKey ? String(raw[dateKey] ?? "").trim() || undefined : undefined,
        opponent: oppKey ? String(raw[oppKey] ?? "").trim() || undefined : undefined,
        comp: compKey ? String(raw[compKey] ?? "").trim() || undefined : undefined,
        homeAway: locKey ? String(raw[locKey] ?? "").trim().toUpperCase() || undefined : undefined,
        gf: toNum(raw[gfKey as any]),
        ga: toNum(raw[gaKey as any]),
        possession: toNum(raw[posKey as any]),
      };

      if (
        r.date ||
        r.opponent ||
        typeof r.gf === "number" ||
        typeof r.ga === "number"
      ) {
        if (r.homeAway && !["H", "A", "N"].includes(r.homeAway)) {
          r.homeAway = undefined;
        }
        recent.push(r);
      }
    }

    // Totales a partir del CSV (si hay datos)
    const gfSum = recent.reduce(
      (acc, x) => (typeof x.gf === "number" ? acc + x.gf : acc),
      0
    );
    const gaSum = recent.reduce(
      (acc, x) => (typeof x.ga === "number" ? acc + x.ga : acc),
      0
    );
    const possVals = recent
      .map((x) => x.possession)
      .filter((v): v is number => typeof v === "number");
    const possAvg =
      possVals.length > 0
        ? Math.round(
            (possVals.reduce((a, b) => a + b, 0) / possVals.length) * 10
          ) / 10
        : undefined;

    // Traemos el estado actual para mergear sin romper otras llaves
    const current = await prisma.rival.findUnique({
      where: { id },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const merged: RivalStats = {
      totals: {
        ...(Number.isFinite(gfSum) ? { gf: gfSum } : {}),
        ...(Number.isFinite(gaSum) ? { ga: gaSum } : {}),
        ...(typeof possAvg === "number" ? { possession: possAvg } : {}),
      },
      recent,
    };

    const row = await prisma.rival.findUnique({
      where: { id },
    });
    return NextResponse.json({ data: row });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
