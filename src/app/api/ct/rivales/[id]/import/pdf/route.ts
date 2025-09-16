import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const prisma = new PrismaClient();
const require = createRequire(import.meta.url);

/* ==================== Utils ==================== */
const asObj = <T extends Record<string, any> = Record<string, any>>(x: unknown): T =>
  typeof x === "object" && x !== null ? (x as T) : ({} as T);

const asStrArray = (x: unknown): string[] =>
  Array.isArray(x) ? x.map((s) => String(s)).filter(Boolean) : [];

const cleanLines = (s?: string | null) =>
  (s || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

const uniq = (arr: string[]) => {
  const set = new Set<string>(); const out: string[] = [];
  for (const v of arr) { const k = v.toLowerCase(); if (!set.has(k)) { set.add(k); out.push(v); } }
  return out;
};

const n = (raw: any): number | undefined => {
  if (raw == null) return undefined;
  const s = String(raw).replace(/[%\s]/g, "").replace(/\./g, "").replace(/,/g, ".");
  const v = Number(s);
  return Number.isFinite(v) ? v : undefined;
};

const pair = (s?: string | null): { ours?: number; opp?: number } => {
  if (!s) return {};
  const m = s.match(/(-?\d+[.,]?\d*)\s*[\/\-–]\s*(-?\d+[.,]?\d*)/);
  if (!m) return {};
  return { ours: n(m[1]), opp: n(m[2]) };
};

function takeBulletsAround(text: string, header: RegExp, stops: RegExp[]): string[] {
  const lines = cleanLines(text); const out: string[] = []; let on = false;
  for (const ln of lines) {
    if (header.test(ln)) { on = true; continue; }
    if (on && stops.some(rx => rx.test(ln))) break;
    if (!on) continue;
    const m = ln.match(/^[\-\*•·]\s*(.+)$/); if (m) out.push(m[1].trim());
  }
  return uniq(out);
}

/* ==================== Heurísticas de extracción ==================== */
function extractCoachAndSystem(text: string) {
  const res: any = {};
  const coach = text.match(/(?:Coach|Entrenador|DT|Director(?:\s+Técnico)?)\s*[:\-]\s*([^\n]+)/i)?.[1];
  if (coach) res.coach = coach.trim();

  const sys =
    text.match(/(?:Formación|Formacion|Sistema|Base System|Formation)[^\n]*[:\-]\s*([0-9](?:\s*[–\-]\s*[0-9])+)/i)?.[1] ||
    text.match(/\b([0-9]\s*[–\-]\s*[0-9](?:\s*[–\-]\s*[0-9]){1,2})\b/)?.[1];
  if (sys) res.system = sys.replace(/\s*–\s*/g, "-").replace(/\s+/g, "");

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

  if (keyPlayers.length) res.keyPlayers = keyPlayers;
  if (strengths.length)  res.strengths  = strengths;
  if (weaknesses.length) res.weaknesses = weaknesses;
  if (setFor.length)     res.setFor     = setFor;
  if (setAgainst.length) res.setAgainst = setAgainst;

  return res;
}

function extractTeamKPIs(text: string) {
  // Buscamos líneas con KPI y un "A/B" (nuestro / rival)
  // Cubrimos español e inglés más comunes en Wyscout
  const map: Array<{ key: string; rx: RegExp }> = [
    { key: "goals",             rx: /\b(Goles|Goals)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "xg",                rx: /\b(xG)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "possessionPct",     rx: /\b(Posesi[óo]n|Possession)\b.*?(-?\d+[.,]?\d*\s*%\s*[\/\-–]\s*-?\d+[.,]?\d*\s*%)/i },
    { key: "passAccuracyPct",   rx: /\b(Precisi[oó]n\s*de\s*pases|Pass\s*accuracy)\b.*?(-?\d+[.,]?\d*\s*%\s*[\/\-–]\s*-?\d+[.,]?\d*\s*%)/i },
    { key: "shots",             rx: /\b(Tiros|Shots)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "shotsOnTarget",     rx: /\b(a\s*puerta|On\s*target)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "crosses",           rx: /\b(Centros|Crosses)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "crossAccuracyPct",  rx: /\b(Precisi[oó]n\s*de\s*centros|Cross\s*accuracy)\b.*?(-?\d+[.,]?\d*\s*%\s*[\/\-–]\s*-?\d+[.,]?\d*\s*%)/i },
    { key: "duelsWonPct",       rx: /\b(Duelos\s*ganados|Duels\s*won)\b.*?(-?\d+[.,]?\d*\s*%\s*[\/\-–]\s*-?\d+[.,]?\d*\s*%)/i },
    { key: "dribblesWonPct",    rx: /\b(Regates\s*exitosos|Dribbles\s*won)\b.*?(-?\d+[.,]?\d*\s*%\s*[\/\-–]\s*-?\d+[.,]?\d*\s*%)/i },
    { key: "ppda",              rx: /\b(PPDA)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "gameIntensity",     rx: /\b(Intensidad\s*de\s*juego|Game\s*intensity)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "touchesInBox",      rx: /\b(Toques\s*en\s*[ée]rea|Touches\s*in\s*box)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "fouls",             rx: /\b(Faltas|Fouls)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "yellowCards",       rx: /\b(Tarjetas\s*amarillas|Yellow\s*cards)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
    { key: "redCards",          rx: /\b(Tarjetas\s*rojas|Red\s*cards)\b.*?(-?\d+[.,]?\d*\s*[\/\-–]\s*-?\d+[.,]?\d*)/i },
  ];

  const team: any = {};
  for (const { key, rx } of map) {
    const m = text.match(rx);
    if (m?.[2]) {
      const p = pair(m[2]);
      if (p.ours != null || p.opp != null) team[key] = p;
    }
  }
  return team;
}

function extractPlayerTable(text: string) {
  // Heurística básica: líneas que empiezan con dorsal + nombre + minutos
  // y luego varios números. Sirve para muchos PDFs de Wyscout.
  const lines = cleanLines(text);
  const players: any[] = [];
  const rowRx = /^\s*(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜ][^\d]+?)\s+(\d{1,3})\b(.*)$/i;

  for (const ln of lines) {
    const m = ln.match(rowRx);
    if (!m) continue;

    const shirt = m[1];
    const name = m[2].replace(/\s{2,}/g, " ").trim();
    const minutes = n(m[3]);
    const tail = m[4];

    // Buscamos patrones comunes en el resto de la fila
    const g = tail.match(/\bG[:\s]\s*(-?\d+)/i)?.[1] ?? tail.match(/\b(\d+)\s+g(?:oles?)?\b/i)?.[1];
    const xg = tail.match(/\bxG[:\s]\s*(-?\d+[.,]?\d*)/i)?.[1];
    const a = tail.match(/\bA[:\s]\s*(-?\d+)/i)?.[1] ?? tail.match(/\b(\d+)\s+asist/i)?.[1];
    const xa = tail.match(/\bxA[:\s]\s*(-?\d+[.,]?\d*)/i)?.[1];
    const shots = tail.match(/\bTiros?[:\s]\s*(\d+)/i)?.[1] ?? tail.match(/\bShots?[:\s]\s*(\d+)/i)?.[1];
    const sot = tail.match(/\b(A\s*puerta|On\s*target)[:\s]\s*(\d+)/i)?.[2];
    const passes = tail.match(/\bPases?[:\s]\s*(\d+)/i)?.[1];
    const passesAcc = tail.match(/\bPrec(?:\.|isi[oó]n)?[:\s]\s*(\d+[.,]?\d*)\s*%/i)?.[1];
    const crosses = tail.match(/\bCentros?[:\s]\s*(\d+)/i)?.[1] ?? tail.match(/\bCrosses?[:\s]\s*(\d+)/i)?.[1];
    const crossesAcc = tail.match(/\bPrec(?:\.|isi[oó]n)?\s*Centros?[:\s]\s*(\d+[.,]?\d*)\s*%/i)?.[1];
    const dribbles = tail.match(/\bRegates?[:\s]\s*(\d+)/i)?.[1] ?? tail.match(/\bDribbles?[:\s]\s*(\d+)/i)?.[1];
    const dribblesWon = tail.match(/\b(Regates?|Dribbles?)\s*(?:exitosos|won)[:\s]\s*(\d+)/i)?.[2];
    const duels = tail.match(/\bDuelos?[:\s]\s*(\d+)/i)?.[1] ?? tail.match(/\bDuels?[:\s]\s*(\d+)/i)?.[1];
    const duelsWon = tail.match(/\b(Duelos?|Duels?)\s*(?:ganados|won)[:\s]\s*(\d+)/i)?.[2];
    const touchesInBox = tail.match(/\bToques\s*en\s*[ée]rea[:\s]\s*(\d+)/i)?.[1];
    const yellow = tail.match(/\bTA[:\s]\s*(\d+)/i)?.[1] ?? tail.match(/\bYellow[:\s]\s*(\d+)/i)?.[1];
    const red = tail.match(/\bTR[:\s]\s*(\d+)/i)?.[1] ?? tail.match(/\bRed[:\s]\s*(\d+)/i)?.[1];

    players.push({
      shirt: n(shirt),
      name,
      minutes,
      goals: n(g),
      xg: n(xg),
      assists: n(a),
      xa: n(xa),
      shots: n(shots),
      shotsOnTarget: n(sot),
      passes: n(passes),
      passesAccurate: n(passesAcc),
      crosses: n(crosses),
      crossesAccurate: n(crossesAcc),
      dribbles: n(dribbles),
      dribblesWon: n(dribblesWon),
      duels: n(duels),
      duelsWon: n(duelsWon),
      touchesInBox: n(touchesInBox),
      yellow: n(yellow),
      red: n(red),
    });
  }

  // Filtramos filas donde al menos tengamos nombre y minutos o alguna métrica
  return players.filter(p => p.name && (p.minutes != null || p.goals != null || p.xg != null));
}

/* =========== Carga robusta de pdf-parse (CommonJS) =========== */
function loadPdfParse(): (input: Uint8Array | ArrayBuffer | Buffer) => Promise<{ text: string }> {
  // @ts-ignore – tipado por nuestro .d.ts local
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

    // Validación rápida de header PDF
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

    // 1) Datos descriptivos
    const meta = extractCoachAndSystem(text);

    // 2) KPIs de equipo (nuestro/rival)
    const teamStats = extractTeamKPIs(text);

    // 3) Tabla por jugador
    const playerStats = extractPlayerTable(text);

    const reportPatch = {
      system: meta.system || undefined,
      strengths: meta.strengths || undefined,
      weaknesses: meta.weaknesses || undefined,
      keyPlayers: meta.keyPlayers || undefined,
      setPieces: {
        ...(meta.setFor ? { for: meta.setFor } : {}),
        ...(meta.setAgainst ? { against: meta.setAgainst } : {}),
      },
      teamStats: Object.keys(teamStats).length ? teamStats : undefined,
      playerStats: playerStats.length ? playerStats : undefined,
    };

    const current = await prisma.rival.findUnique({
      where: { id },
      select: { coach: true, baseSystem: true, planReport: true },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    // Merge no destructivo
    const savedReport = asObj<any>(current.planReport);
    const savedSP = asObj<any>(savedReport.setPieces);
    const patchSP = asObj<any>(reportPatch.setPieces);

    const mergedSetPieces = {
      ...asObj(savedSP),
      ...asObj(patchSP),
      ...(patchSP.for
        ? { for: asStrArray(patchSP.for) }
        : savedSP.for
        ? { for: asStrArray(savedSP.for) }
        : {}),
      ...(patchSP.against
        ? { against: asStrArray(patchSP.against) }
        : savedSP.against
        ? { against: asStrArray(savedSP.against) }
        : {}),
    };

    const mergedReport = {
      ...asObj(savedReport),
      ...asObj(reportPatch),
      setPieces: mergedSetPieces,
      teamStats: { ...asObj(savedReport.teamStats), ...asObj(reportPatch.teamStats) },
      playerStats: reportPatch.playerStats?.length
        ? reportPatch.playerStats
        : savedReport.playerStats,
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
      data: {
        coach: row.coach,
        baseSystem: row.baseSystem,
        planReport: asObj(row.planReport),
      },
      message: "PDF procesado: KPIs y jugadores importados.",
    });
  } catch (e: any) {
    const msg = String(e?.message || e || "Error");
    return new NextResponse(msg, { status: 500 });
  }
}
