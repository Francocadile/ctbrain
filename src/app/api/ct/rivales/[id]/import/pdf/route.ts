// src/app/api/ct/rivales/[id]/import/pdf/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const prisma = new PrismaClient();
const require = createRequire(import.meta.url);

/* =============== Utils generales =============== */
const asObj = <T extends Record<string, any> = Record<string, any>>(x: unknown): T =>
  typeof x === "object" && x !== null ? (x as T) : ({} as T);
const asStrArray = (x: unknown): string[] =>
  Array.isArray(x) ? x.map((s) => String(s)).filter(Boolean) : [];
const clean = (s?: string | null) =>
  (s || "").replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").trim();
const lines = (s?: string | null) =>
  clean(s).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const toNum = (s: string | number | undefined | null) => {
  if (s === undefined || s === null) return undefined;
  const n = typeof s === "number" ? s : Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
const pairNums = (txt: string): { ours?: number; opp?: number } => {
  const m = txt.match(/(-?\d+(?:[.,]\d+)?)[^\d\-]+(-?\d+(?:[.,]\d+)?)/);
  return { ours: m ? toNum(m[1]) : undefined, opp: m ? toNum(m[2]) : undefined };
};

const uniq = (arr: string[]) => {
  const set = new Set<string>(); const out: string[] = [];
  for (const v of arr) { const k = v.toLowerCase(); if (!set.has(k)) { set.add(k); out.push(v); } }
  return out;
};
function takeBulletsAround(text: string, header: RegExp, stops: RegExp[]): string[] {
  const ls = lines(text); const out: string[] = []; let on = false;
  for (const ln of ls) {
    if (header.test(ln)) { on = true; continue; }
    if (on && stops.some(rx => rx.test(ln))) break;
    if (!on) continue;
    const m = ln.match(/^[\-\*•·]\s*(.+)$/); if (m) out.push(m[1].trim());
  }
  return uniq(out);
}

/* =============== Parse específico Wyscout =============== */
function extractCoachAndSystem(text: string) {
  const res: any = {};
  const coach = text.match(/(?:Coach|Entrenador|DT|Director(?:\s+Técnico)?)\s*[:\-]\s*([^\n]+)/i)?.[1];
  if (coach) res.coach = coach.trim();

  const sys =
    text.match(/(?:Formación|Formacion|Sistema|Base System|Formation)[^\n]*[:\-]\s*([0-9](?:\s*[–\-]\s*[0-9])+)/i)?.[1] ||
    text.match(/\b([0-9]\s*[–\-]\s*[0-9](?:\s*[–\-]\s*[0-9]){1,2})\b/)?.[1];
  if (sys) res.system = sys.replace(/\s*–\s*/g, "-").replace(/\s+/g, "");

  // Bullets (si existen)
  const keyPlayers = takeBulletsAround(
    text,
    /(Jugadores?\s+clave|Key\s+Players?)\b/i,
    [/(Fortalezas|Debilidades|Strengths|Weaknesses|Balón|Set\s*pieces?)/i]
  );
  const strengths = takeBulletsAround(
    text,
    /(Fortalezas|Strengths)\b/i,
    [/(Debilidades|Weaknesses|Balón|Set\s*pieces?|Key\s+Players?)/i]
  );
  const weaknesses = takeBulletsAround(
    text,
    /(Debilidades|Weaknesses)\b/i,
    [/(Fortalezas|Strengths|Balón|Set\s*pieces?|Key\s+Players?)/i]
  );
  const setFor = takeBulletsAround(
    text,
    /(Bal[oó]n\s+parado.*a\s+favor|Set\s*pieces?\s*\(for\))/i,
    [/(en\s+contra|against|Fortalezas|Debilidades|Strengths|Weaknesses|Key\s+Players?)/i]
  );
  const setAgainst = takeBulletsAround(
    text,
    /(Bal[oó]n\s+parado.*en\s+contra|Set\s*pieces?\s*\(against\))/i,
    [/(a\s+favor|for|Fortalezas|Debilidades|Strengths|Weaknesses|Key\s+Players?)/i]
  );

  return { coach: res.coach, system: res.system, keyPlayers, strengths, weaknesses, setFor, setAgainst };
}

function extractTeamKPIsBlock(text: string) {
  // En la sección de “FORMACIONES UCV” (la con los dos números por métrica)
  // buscamos las etiquetas clave y leemos el par “nuestro vs rival”.
  const getBlock = (label: RegExp) => {
    // Tomamos ~2 líneas siguientes al match y dejamos solo números
    const ls = lines(text);
    const i = ls.findIndex(l => label.test(l));
    if (i === -1) return undefined;
    const sample = [ls[i + 1] || "", ls[i + 2] || ""].join(" ");
    return pairNums(sample);
  };

  const goals      = getBlock(/\bGOLES\b/i);
  const xg         = getBlock(/\bXG\b/i);
  const poss       = getBlock(/POSESI[ÓO]N DEL BAL[ÓO]N/i);
  const passAcc    = getBlock(/PRECISI[ÓO]N PASES/i);
  const intensity  = getBlock(/INTENSIDAD DE JUEGO/i);
  const ppda       = getBlock(/\bPPDA\b/i);

  return {
    goals,              // { ours, opp }
    xg,                 // { ours, opp }
    possessionPct: poss,
    passAccuracyPct: passAcc,
    gameIntensity: intensity,
    ppda
  };
}

type PlayerRow = {
  shirt?: number;
  name: string;
  minutes?: number;
  goals?: number;
  xg?: number;
  assists?: number;
  xa?: number;
  shots?: number;
  shotsOnTarget?: number;
  passes?: number;
  passesAccurate?: number;
  crosses?: number;
  crossesAccurate?: number;
  dribbles?: number;
  dribblesWon?: number;
  duels?: number;
  duelsWon?: number;
  touchesInBox?: number;
  yellow?: number;
  red?: number;
};

// Parser de la tabla “Jugador / Minutos / Goles / xG / Asistencias / xA / Tiros / a la portería / Pases / precisos …”
function extractPlayerStats(text: string): PlayerRow[] {
  const ls = lines(text);

  // Buscamos el header que incluye muchas de estas palabras
  const startIdx = ls.findIndex(l =>
    /Jugador\s+Minutos\s+jugados\s+Goles\s*\/\s*xG/i.test(l)
  );
  if (startIdx === -1) return [];

  const out: PlayerRow[] = [];
  // Las filas suelen venir en el bloque siguiente, hasta que cambie de sección
  for (let i = startIdx + 1; i < ls.length; i++) {
    const ln = ls[i];

    // Cortamos cuando cambia la sección (palabras grandes en mayúsculas típicas)
    if (/INFORME DEL EQUIPO|FORMACIONES|PARTIDOS|FASE DEFENSIVA|ATAQUE|FINALIZACI[ÓO]N|GLOSARIO/i.test(ln)) break;

    // Filas tipo:
    // "8 J. Zapata 463 4 / 3.00 2 / 1.03 15 / 8 94 / 64 17 / 8 11 / 6 100 / 45 58 / 11 20 / 17 23 1 / 0"
    // Toleramos nombres con espacios/acentos y varios huecos.
    const m = ln.match(
      /^\s*(\d+)\s+([A-ZÁÉÍÓÚÑ][^0-9]+?)\s+(\d+)\s+(\d+)\s*\/\s*([\d.,]+)\s+(\d+)\s*\/\s*([\d.,]+)\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*(\d+)/
    );
    if (!m) continue;

    out.push({
      shirt: toNum(m[1]),
      name: clean(m[2]),
      minutes: toNum(m[3]),
      goals: toNum(m[4]),
      xg: toNum(m[5]),
      assists: toNum(m[6]),
      xa: toNum(m[7]),
      shots: toNum(m[8]),
      shotsOnTarget: toNum(m[9]),
      passes: toNum(m[10]),
      passesAccurate: toNum(m[11]),
      crosses: toNum(m[12]),
      crossesAccurate: toNum(m[13]),
      dribbles: toNum(m[14]),
      dribblesWon: toNum(m[15]),
      duels: toNum(m[16]),
      duelsWon: toNum(m[17]),
      touchesInBox: toNum(m[18]),
      // El último par suele ser "tarjetas amarillas / rojas"
      yellow: toNum(m[19]),
      red: toNum(m[20]),
    });
  }

  return out;
}

/* =========== Carga robusta de pdf-parse (CommonJS) =========== */
function loadPdfParse(): (input: Uint8Array | ArrayBuffer | Buffer) => Promise<{ text: string }> {
  // @ts-ignore – la d.ts local tipa el default
  const mod = require("pdf-parse");
  const fn = (mod?.default ?? mod) as any;
  if (typeof fn !== "function") {
    throw new Error("pdf-parse no se pudo cargar correctamente");
  }
  return fn;
}

/* ==================== Handler ==================== */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new NextResponse("archivo PDF requerido (file)", { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const u8 = new Uint8Array(ab);

    // Valida header PDF
    const header = new TextDecoder().decode(u8.slice(0, 5));
    if (header !== "%PDF-") {
      return new NextResponse("El archivo no parece ser un PDF válido", { status: 400 });
    }

    const pdfParse = loadPdfParse();
    const parsed = await pdfParse(u8);
    const text = String(parsed?.text || "");
    if (!text.trim()) {
      return new NextResponse("No se pudo extraer texto del PDF", { status: 422 });
    }

    // ---- Campos “cualitativos” ya existentes
    const meta = extractCoachAndSystem(text);
    const reportPatch: any = {
      system: meta.system || undefined,
      strengths: meta.strengths || undefined,
      weaknesses: meta.weaknesses || undefined,
      keyPlayers: meta.keyPlayers || undefined,
      setPieces: {
        ...(meta.setFor ? { for: meta.setFor } : {}),
        ...(meta.setAgainst ? { against: meta.setAgainst } : {}),
      },
    };

    // ---- NUEVO: KPIs de equipo + tabla por jugador
    const teamStats = extractTeamKPIsBlock(text);
    const playerStats = extractPlayerStats(text);

    if (teamStats) reportPatch.teamStats = teamStats;
    if (playerStats.length) reportPatch.playerStats = playerStats;

    // ---- Merge suave en planReport
    const current = await prisma.rival.findUnique({
      where: { id },
      select: { coach: true, baseSystem: true, planReport: true },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const savedReport = asObj<any>(current.planReport);

    const mergedReport = {
      ...savedReport,
      ...reportPatch,
      setPieces: {
        ...asObj(savedReport.setPieces),
        ...asObj(reportPatch.setPieces),
      },
    };

    const dataPatch: any = { planReport: mergedReport };
    if (meta.coach)  dataPatch.coach = meta.coach;
    if (meta.system) dataPatch.baseSystem = meta.system;

    const row = await prisma.rival.update({
      where: { id },
      data: dataPatch,
      select: { coach: true, baseSystem: true, planReport: true },
    });

    return NextResponse.json({
      data: { coach: row.coach, baseSystem: row.baseSystem, planReport: asObj(row.planReport) },
      message: "PDF procesado. Se actualizaron Plan y Estadísticas (si se pudieron extraer).",
    });
  } catch (e: any) {
    const msg = String(e?.message || e || "Error");
    return new NextResponse(msg, { status: 500 });
  }
}
