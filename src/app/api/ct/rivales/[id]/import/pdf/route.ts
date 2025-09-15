import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";      // <- importante para Vercel (pdf-parse requiere Node APIs)
export const maxDuration = 60;

const prisma = new PrismaClient();

// Utils seguros
function asObj<T extends Record<string, any> = Record<string, any>>(x: unknown): T {
  return typeof x === "object" && x !== null ? (x as T) : ({} as T);
}
function asStrArray(x: unknown): string[] {
  return Array.isArray(x) ? x.map((s) => String(s)).filter(Boolean) : [];
}
function cleanLines(s?: string | null): string[] {
  return (s || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
function uniq(arr: string[]): string[] {
  const set = new Set<string>(); const out: string[] = [];
  for (const v of arr) { const k = v.toLowerCase(); if (!set.has(k)) { set.add(k); out.push(v); } }
  return out;
}
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
  const sys = text.match(/(?:Formación|Formacion|Sistema|Base System|Formation)[^\n]*[:\-]\s*([0-9](?:\s*[–\-]\s*[0-9])+)/i)?.[1]
           || text.match(/\b([0-9]\s*[–\-]\s*[0-9](?:\s*[–\-]\s*[0-9]){1,2})\b/)?.[1];
  if (sys) res.system = sys.replace(/\s*–\s*/g, "-").replace(/\s+/g, "");

  const keyPlayers = takeBulletsAround(text, /(Jugadores?\s+clave|Key\s+Players?)\b/i, [/(Fortalezas|Debilidades|Strengths|Weaknesses|Balón|Set\s*pieces?)/i]);
  const strengths  = takeBulletsAround(text, /(Fortalezas|Strengths)\b/i,        [/(Debilidades|Weaknesses|Balón|Set\s*pieces?|Key\s+Players?)/i]);
  const weaknesses = takeBulletsAround(text, /(Debilidades|Weaknesses)\b/i,      [/(Fortalezas|Strengths|Balón|Set\s*pieces?|Key\s+Players?)/i]);
  const setFor     = takeBulletsAround(text, /(Bal[oó]n\s+parado.*a\s+favor|Set\s*pieces?\s*\(for\))/i,
                                       [/(en\s+contra|against|Fortalezas|Debilidades|Strengths|Weaknesses|Key\s+Players?)/i]);
  const setAgainst = takeBulletsAround(text, /(Bal[oó]n\s+parado.*en\s+contra|Set\s*pieces?\s*\(against\))/i,
                                       [/(a\s+favor|for|Fortalezas|Debilidades|Strengths|Weaknesses|Key\s+Players?)/i]);

  if (keyPlayers.length) res.keyPlayers = keyPlayers;
  if (strengths.length)  res.strengths  = strengths;
  if (weaknesses.length) res.weaknesses = weaknesses;
  if (setFor.length)     res.setFor     = setFor;
  if (setAgainst.length) res.setAgainst = setAgainst;
  return res;
}

// Carga segura de pdf-parse (algunos bundles no exponen default igual)
async function loadPdfParse(): Promise<(b: Buffer) => Promise<{ text: string }>> {
  const mod: any = await import("pdf-parse");
  const fn = mod?.default ?? mod;
  if (typeof fn !== "function") {
    throw new Error("pdf-parse no se pudo cargar correctamente");
  }
  return fn as (b: Buffer) => Promise<{ text: string }>;
}

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
    const buf = Buffer.from(ab);
    if (!buf.length) {
      return new NextResponse("El archivo está vacío o no se pudo leer", { status: 400 });
    }

    const pdfParse = await loadPdfParse();
    const parsed = await pdfParse(buf);
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
        ...(ext.setAgainst ? { against: ext.setAgainst } : {}),
      },
    };

    const current = await prisma.rival.findUnique({
      where: { id },
      select: { coach: true, baseSystem: true, planReport: true },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const savedReport = asObj<any>(current.planReport);
    const savedSP = asObj<any>(savedReport.setPieces);
    const patchSP = asObj<any>(reportPatch.setPieces);

    const mergedSetPieces = {
      ...asObj(savedSP),
      ...asObj(patchSP),
      ...(patchSP.for     ? { for: asStrArray(patchSP.for) }         : savedSP.for     ? { for: asStrArray(savedSP.for) }         : {}),
      ...(patchSP.against ? { against: asStrArray(patchSP.against) } : savedSP.against ? { against: asStrArray(savedSP.against) } : {}),
    };

    const mergedReport = {
      ...asObj(savedReport),
      ...asObj(reportPatch),
      setPieces: mergedSetPieces,
    };

    const dataPatch: any = { planReport: mergedReport };
    if (ext.coach)  dataPatch.coach = ext.coach;
    if (ext.system) dataPatch.baseSystem = ext.system;

    const row = await prisma.rival.update({
      where: { id },
      data: dataPatch,
      select: { coach: true, baseSystem: true, planReport: true },
    });

    return NextResponse.json({
      data: { coach: row.coach, baseSystem: row.baseSystem, planReport: asObj(row.planReport) },
      message: "PDF procesado y datos fusionados.",
    });
  } catch (e: any) {
    // Si pdf-parse intenta acceder a un path “de ejemplo”, mostramos un mensaje claro
    const msg = String(e?.message || e || "Error");
    const friendly = /ENOENT.*test\/data\/05-versions-space\.pdf/.test(msg)
      ? "El PDF no llegó correctamente al servidor. Volvé a seleccionar el archivo e intentar de nuevo."
      : msg;
    return new NextResponse(friendly, { status: 500 });
  }
}
