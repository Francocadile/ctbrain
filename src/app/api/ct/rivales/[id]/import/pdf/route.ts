// src/app/api/ct/rivales/[id]/import/pdf/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

// ===== Helpers de tipos seguros =====
function asObj<T extends Record<string, any> = Record<string, any>>(x: unknown): T {
  return typeof x === "object" && x !== null ? (x as T) : ({} as T);
}
function asStrArray(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((s) => String(s)).filter(Boolean);
  return [];
}
function cleanLines(s?: string | null): string[] {
  return (s || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = v.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}
function takeBulletsAround(text: string, headerRegex: RegExp, stopRegexes: RegExp[]): string[] {
  const lines = cleanLines(text);
  const out: string[] = [];
  let on = false;
  for (const ln of lines) {
    if (headerRegex.test(ln)) { on = true; continue; }
    if (on && stopRegexes.some((rx) => rx.test(ln))) break;
    if (!on) continue;
    // bullets típicos: -, •, ·, *
    const m = ln.match(/^[\-\*•·]\s*(.+)$/);
    if (m) out.push(m[1].trim());
  }
  return uniq(out);
}

// Heurísticas muy simples para extraer algunos campos Wyscout
function extractFromPDFText(text: string) {
  const out: {
    coach?: string;
    system?: string;
    keyPlayers?: string[];
    strengths?: string[];
    weaknesses?: string[];
    setFor?: string[];
    setAgainst?: string[];
  } = {};

  // Coach / DT
  const coachMatch =
    text.match(/(?:Coach|Entrenador|DT)\s*[:\-]\s*([^\n]+)$/im) ||
    text.match(/Director(?:\s+Técnico)?\s*[:\-]\s*([^\n]+)$/im);
  if (coachMatch) out.coach = coachMatch[1].trim();

  // Sistema / Formación (4-3-3, 4–2–3–1, etc.)
  const sysMatch =
    text.match(/(?:Formación|Formacion|Sistema|Base System|Formation)[^\n]*[:\-]\s*([0-9](?:\s*[–\-]\s*[0-9])+)/i) ||
    text.match(/\b([0-9]\s*[–\-]\s*[0-9](?:\s*[–\-]\s*[0-9]){1,2})\b/);
  if (sysMatch) out.system = sysMatch[1].replace(/\s*–\s*/g, "-").replace(/\s+/g, "");

  // Jugadores clave
  // Buscamos sección y tomamos bullets hasta el próximo encabezado
  const keyPlayers = takeBulletsAround(
    text,
    /(Jugadores?\s+clave|Key\s+Players?)\b/i,
    [/(Fortalezas|Debilidades|Strengths|Weaknesses|Balón|Set\s+pieces?)/i]
  );
  if (keyPlayers.length) out.keyPlayers = keyPlayers;

  // Fortalezas
  const strengths = takeBulletsAround(
    text,
    /(Fortalezas|Strengths)\b/i,
    [/(Debilidades|Weaknesses|Balón|Set\s+pieces?|Jugadores?\s+clave|Key\s+Players?)/i]
  );
  if (strengths.length) out.strengths = strengths;

  // Debilidades
  const weaknesses = takeBulletsAround(
    text,
    /(Debilidades|Weaknesses)\b/i,
    [/(Fortalezas|Strengths|Balón|Set\s+pieces?|Jugadores?\s+clave|Key\s+Players?)/i]
  );
  if (weaknesses.length) out.weaknesses = weaknesses;

  // Balón parado – a favor / en contra
  const setFor = takeBulletsAround(
    text,
    /(Bal[oó]n\s+parado.*a\s+favor|Set\s*pieces?\s*\(for\))/i,
    [/(en\s+contra|against|Fortalezas|Debilidades|Strengths|Weaknesses|Jugadores?\s+clave|Key\s+Players?)/i]
  );
  if (setFor.length) out.setFor = setFor;

  const setAgainst = takeBulletsAround(
    text,
    /(Bal[oó]n\s+parado.*en\s+contra|Set\s*pieces?\s*\(against\))/i,
    [/(a\s+favor|for|Fortalezas|Debilidades|Strengths|Weaknesses|Jugadores?\s+clave|Key\s+Players?)/i]
  );
  if (setAgainst.length) out.setAgainst = setAgainst;

  return out;
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
      return new NextResponse("archivo PDF requerido (file)", { status: 400 });
    }

    // Leemos el PDF
    const ab = await (file as File).arrayBuffer();
    const buf = Buffer.from(ab);

    // Carga dinámica + parse
    const pdfParse = (await import("pdf-parse")).default as unknown as (b: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buf);
    const text = String(parsed?.text || "");

    // Heurísticas de extracción
    const ext = extractFromPDFText(text);
    const reportPatch = {
      system: ext.system || undefined,
      strengths: ext.strengths || undefined,
      weaknesses: ext.weaknesses || undefined,
      keyPlayers: ext.keyPlayers || undefined,
      setPieces: {
        ...(ext.setFor ? { for: ext.setFor } : {}),
        ...(ext.setAgainst ? { against: ext.setAgainst } : {}),
      },
    };

    // Traemos lo actual para mergear de forma segura (sin spreads sobre no-objetos)
    const current = await prisma.rival.findUnique({
      where: { id },
      select: { coach: true, baseSystem: true, planReport: true },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const savedReport = asObj<any>(current.planReport);
    const savedSP = asObj<any>(savedReport.setPieces);
    const patchSP = asObj<any>(reportPatch.setPieces);

    const mergedSetPieces = asObj<any>({
      ...asObj(savedSP),
      ...asObj(patchSP),
    });

    if (patchSP.for) mergedSetPieces.for = asStrArray(patchSP.for);
    else if (savedSP.for) mergedSetPieces.for = asStrArray(savedSP.for);

    if (patchSP.against) mergedSetPieces.against = asStrArray(patchSP.against);
    else if (savedSP.against) mergedSetPieces.against = asStrArray(savedSP.against);

    const mergedReport = {
      ...asObj(savedReport),
      ...asObj(reportPatch),
      setPieces: mergedSetPieces,
    };

    // Armamos patch de actualización evitando setear undefined
    const dataPatch: any = { planReport: mergedReport };
    if (ext.coach) dataPatch.coach = ext.coach;
    if (ext.system) dataPatch.baseSystem = ext.system;

    const row = await prisma.rival.update({
      where: { id },
      data: dataPatch,
      select: {
        coach: true,
        baseSystem: true,
        planReport: true,
      },
    });

    return NextResponse.json({
      data: {
        coach: row.coach,
        baseSystem: row.baseSystem,
        planReport: asObj(row.planReport),
      },
      message: "PDF procesado y datos fusionados.",
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
