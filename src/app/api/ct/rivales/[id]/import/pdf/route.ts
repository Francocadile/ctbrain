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

function extractFromPDFText(text: string) {
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

/* =========== Carga robusta de pdf-parse (CommonJS) =========== */
function loadPdfParse(): (input: Uint8Array | ArrayBuffer | Buffer) => Promise<{ text: string }> {
  // pdf-parse es CJS; lo cargamos con require para SSR en Vercel
  // y evitamos cualquier dependencia a canvas/worker.
  // @ts-ignore – lo tipamos con nuestro d.ts
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

    const ext = extractFromPDFText(text);
    const reportPatch = {
      system: ext.system || undefined,
      strengths: ext.strengths || undefined,
      weaknesses: ext.weaknesses || undefined,
      keyPlayers: ext.keyPlayers || undefined,
      setPieces: {
        ...(ext.setFor ? { for: ext.setFor } : {}),
        ...(ext.setAgainst ? { against: ext.setAgainst } : {})
      }
    };

    const current = await prisma.rival.findUnique({
      where: { id },
      select: { coach: true, baseSystem: true, planReport: true }
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

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
        : {})
    };

    const mergedReport = {
      ...asObj(savedReport),
      ...asObj(reportPatch),
      setPieces: mergedSetPieces
    };

    const dataPatch: any = { planReport: mergedReport };
    if (ext.coach)  dataPatch.coach = ext.coach;
    if (ext.system) dataPatch.baseSystem = ext.system;

    const row = await prisma.rival.update({
      where: { id },
      data: dataPatch,
      select: { coach: true, baseSystem: true, planReport: true }
    });

    return NextResponse.json({
      data: {
        coach: row.coach,
        baseSystem: row.baseSystem,
        planReport: asObj(row.planReport)
      },
      message: "PDF procesado y datos fusionados."
    });
  } catch (e: any) {
    const msg = String(e?.message || e || "Error");
    return new NextResponse(msg, { status: 500 });
  }
}
