// src/app/api/ct/rivales/[id]/import/csv/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

type RecentRow = {
  date?: string;
  opponent?: string;
  comp?: string;
  homeAway?: string; // H/A/N
  gf?: number;
  ga?: number;
  possession?: number; // opcional por fila
};

function toNumber(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).replace(",", ".").replace("%", "").trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return new NextResponse("file requerido (multipart/form-data, key=file)", { status: 400 });
    }
    const text = await (file as File).text();

    const Papa = (await import("papaparse")).default;
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.errors?.length) {
      return NextResponse.json({ errors: parsed.errors.slice(0, 3) }, { status: 400 });
    }

    // Intentamos columnas típicas
    const rows: RecentRow[] = [];
    const data = parsed.data as any[];

    for (const r of data) {
      const row: RecentRow = {
        date: (r.date || r.Date || r.fecha || r.Fecha || "").trim?.() || undefined,
        opponent: (r.opponent || r.Opponent || r.rival || r.Rival || "").trim?.() || undefined,
        comp: (r.comp || r.Competition || r.competition || r.Competencia || "").trim?.() || undefined,
        homeAway: (r.homeAway || r.HomeAway || r.loc || r.Loc || r.localia || r.Localia || "").trim?.() || undefined,
        gf: toNumber(r.gf ?? r.GF ?? r.goalsFor ?? r.GoalsFor ?? r["GF"]),
        ga: toNumber(r.ga ?? r.GA ?? r.goalsAgainst ?? r.GoalsAgainst ?? r["GA"]),
        possession: toNumber(r.possession ?? r.Possession ?? r["Possession %"] ?? r["%Possession"]),
      };
      if (row.date || row.opponent || row.gf !== undefined || row.ga !== undefined) {
        rows.push(row);
      }
    }

    // Totales (si no vienen explícitos): sumamos GF/GA; posesión = promedio de filas con dato
    const gfSum = rows.reduce((acc, r) => acc + (r.gf ?? 0), 0);
    const gaSum = rows.reduce((acc, r) => acc + (r.ga ?? 0), 0);
    const possVals = rows.map(r => r.possession).filter((v): v is number => typeof v === "number");
    const possession = possVals.length ? Math.round((possVals.reduce((a, b) => a + b, 0) / possVals.length) * 10) / 10 : undefined;

    // Mapear a estructura guardada
    const recent = rows.map(r => ({
      date: r.date,
      opponent: r.opponent,
      comp: r.comp,
      homeAway: r.homeAway?.toUpperCase?.(),
      gf: r.gf,
      ga: r.ga,
    }));

    // Merge sobre planStats
    const current = await prisma.rival.findUnique({
      where: { id },
      select: { planStats: true },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const mergedStats = {
      ...(current.planStats || {}),
      totals: {
        ...(current.planStats as any)?.totals,
        gf: gfSum || (current.planStats as any)?.totals?.gf,
        ga: gaSum || (current.planStats as any)?.totals?.ga,
        possession: possession ?? (current.planStats as any)?.totals?.possession,
      },
      recent, // reemplazo directo: CSV suele representar el set más confiable
    };

    const row = await prisma.rival.update({
      where: { id },
      data: { planStats: mergedStats as any },
      select: { planStats: true },
    });

    return NextResponse.json({
      data: row.planStats,
      summary: { rows: recent.length, gfSum, gaSum, possession },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
