import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

/** Next runtime */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const prisma = new PrismaClient();

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

/* ==================== PDF text extract (pdfjs-dist) ==================== */
async function extractTextWithPdfJs(u8: Uint8Array): Promise<string> {
  // Import dinámico para SSR
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");

  // sin worker en SSR
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = null;
  }

  const loadingTask = pdfjs.getDocument({ data: u8, disableWorker: true });
  const doc = await loadingTask.promise;
  let all = "";

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => (typeof it.str === "string" ? it.str : "")).join(" ");
    all += text + "\n";
  }

  try { await doc?.destroy?.(); } catch {}
  return all;
}

/* ==================== Parse heurístico ==================== */
function extractFromPDFText(text: string) {
  const res: any = {};

  const coach = text.match(/(?:Coach|Entrenador|DT|Director(?:\s+T[eé]cnico)?)\s*[:\-]\s*([^\n]+)/i)?.[1];
  if (coach) res.coach = coach.trim();

  const sys =
    text.match(/(?:Formaci[oó]n|Sistema|Base System|Formation)[^\n]*[:\-]\s*([0-9](?:\s*[–\-]\s*[0-9])+)/i)?.[1] ||
    text.match(/\b([0-9]\s*[–\-]\s*[0-9](?:\s*[–\-]\s*[0-9]){1,2})\b/)?.[1];
  if (sys) res.system = sys.replace(/\s*–\s*/g, "-").replace(/\s+/g, "");

  const keyPlayers = takeBulletsAround(text, /(Jugadores?\s+clave|Key\s+Players?)\b/i, [/(Fortalezas|Debilidades|Strengths|Weaknesses|Bal[oó]n|Set\s*pieces?)/i]);
  const strengths  = takeBulletsAround(text, /(Fortalezas|Strengths)\b/i,        [/(Debilidades|Weaknesses|Bal[oó]n|Set\s*pieces?|Key\s+Players?)/i]);
  const weaknesses = takeBulletsAround(text, /(Debilidades|Weaknesses)\b/i,      [/(Fortalezas|Strengths|Bal[oó]n|Set\s*pieces?|Key\s+Players?)/i]);
  const setFor     = takeBulletsAround(text, /(Bal[oó]n\s+parado.*a\s+favor|Set\s*pieces?\s*\(for\))/i,
                                       [/(en\s+contra|against|Fortalezas|Debilidades|Strengths|Weaknesses|Key\s+Players?)/i]);
  const setAgainst = takeBulletsAround(text, /(Bal[oó]n\s+parado.*en\s+contra|Set\s*pieces?\s*\(against\))/i,
                                       [/(a\s+favor|for|Fortalezas|Debilidades|Strengths|Weaknesses|Key\s+Players?)/i]);

  if (keyPlayers.length) res.keyPlayers = keyPlayers;
  if (strengths.length)  res.strengths  = strengths;
  if (weaknesses.length) res.weaknesses = weaknesses;
  if (setFor.length)     res.setFor     = setFor;
  if (setAgainst.length) res.setAgainst = setAgainst;

  const totals: Record<string, number> = {};
  const numFrom = (rx: RegExp) => {
    const m = text.match(rx);
    if (!m) return undefined;
    const val = (m[1] ?? "").toString().replace(",", ".").replace(/[^\d.]/g, "");
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  };
  const pctFrom = (rx: RegExp) => {
    const m = text.match(rx);
    if (!m) return undefined;
    const v = (m[1] ?? "").toString().replace(",", ".").replace("%", "");
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // GF/GA
  const gf = numFrom(/\b(GF|Goals? For|Goles? a favor)\b[^\d:]*[:=\s]\s*([0-9]+)\b/i) ?? numFrom(/\bGF[:=\s]+([0-9]+)\b/i);
  const ga = numFrom(/\b(GA|Goals? Against|Goles? en contra)\b[^\d:]*[:=\s]\s*([0-9]+)\b/i) ?? numFrom(/\bGA[:=\s]+([0-9]+)\b/i);
  if (gf !== undefined) totals.gf = gf;
  if (ga !== undefined) totals.ga = ga;

  // posesión
  const possession =
    pctFrom(/\bPosesi[oó]n(?:\s+del\s+bal[oó]n)?\b[^\d:]*[:=\s]\s*([0-9]+(?:[.,][0-9]+)?)\s*%?/i) ??
    pctFrom(/\bPossession\b[^\d:]*[:=\s]\s*([0-9]+(?:[.,][0-9]+)?)\s*%?/i);
  if (possession !== undefined) totals.possession = possession;

  // tiros / tiros a puerta
  const shots = numFrom(/\b(Tiros?|Remates?|Total\s+Shots?)\b[^\d:]*[:=\s]\s*([0-9]+)\b/i);
  const shotsOnTarget = numFrom(/\b(?:Tiros?|Remates?)\s+a\s+(?:puerta|port[eé]ria)\b[^\d:]*[:=\s]\s*([0-9]+)\b/i)
                     ?? numFrom(/\bShots?\s+on\s+Target\b[^\d:]*[:=\s]\s*([0-9]+)\b/i);
  if (shots !== undefined) totals.shots = shots;
  if (shotsOnTarget !== undefined) totals.shotsOnTarget = shotsOnTarget;

  // xG
  const xg = numFrom(/\b(xG|Expected\s+Goals?)\b[^\d:]*[:=\s]\s*([0-9]+(?:[.,][0-9]+)?)\b/i);
  if (xg !== undefined) totals.xg = xg;

  if (Object.keys(totals).length) res.totals = totals;

  return res;
}

/* ==================== Handler ==================== */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const form = await req.formData();
    const fileEntry = (form.get("file") ?? form.get("pdf")) as unknown;

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Archivo PDF requerido (campo 'file' o 'pdf')" }, { status: 400 });
    }

    const ab = await fileEntry.arrayBuffer();
    const u8 = new Uint8Array(ab);

    // validar header
    const header = new TextDecoder().decode(u8.slice(0, 5));
    if (header !== "%PDF-") {
      return NextResponse.json({ error: "El archivo no parece ser un PDF válido" }, { status: 400 });
    }

    // EXTRAER TEXTO (sin fs, sin rutas locales)
    const text = await extractTextWithPdfJs(u8);
    if (!text.trim()) {
      return NextResponse.json({ error: "No se pudo extraer texto del PDF" }, { status: 422 });
    }

    // Parsear y fusionar
    const ext = extractFromPDFText(text);

    const reportPatch = {
      system: ext.system || undefined,
      strengths: ext.strengths || undefined,
      weaknesses: ext.weaknesses || undefined,
      keyPlayers: ext.keyPlayers || undefined,
      totals: ext.totals || undefined,
      setPieces: {
        ...(ext.setFor ? { for: ext.setFor } : {}),
        ...(ext.setAgainst ? { against: ext.setAgainst } : {})
      }
    };

    const current = await prisma.rival.findUnique({
      where: { id },
      select: { coach: true, baseSystem: true, planReport: true }
    });
    if (!current) return NextResponse.json({ error: "Rival no encontrado" }, { status: 404 });

    const savedReport = asObj<any>(current.planReport);
    const savedSP = asObj<any>(savedReport.setPieces);
    const patchSP = asObj<any>(reportPatch.setPieces);

    const mergedSetPieces = {
      ...asObj(savedSP),
      ...asObj(patchSP),
      ...(patchSP.for ? { for: asStrArray(patchSP.for) } : savedSP.for ? { for: asStrArray(savedSP.for) } : {}),
      ...(patchSP.against ? { against: asStrArray(patchSP.against) } : savedSP.against ? { against: asStrArray(savedSP.against) } : {})
    };

    const mergedTotals = { ...asObj(savedReport.totals), ...asObj(reportPatch.totals) };

    const mergedReport = {
      ...asObj(savedReport),
      ...asObj(reportPatch),
      setPieces: mergedSetPieces,
      totals: Object.keys(mergedTotals).length ? mergedTotals : undefined
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
      data: { coach: row.coach, baseSystem: row.baseSystem, planReport: asObj(row.planReport) },
      message: "PDF procesado: se actualizaron plan y estadísticas."
    });
  } catch (e: any) {
    console.error("[PDF IMPORT ERROR]", e);
    const stack = String(e?.stack || "").split("\n").slice(0, 5).join("\n");
    const msg = String(e?.message || e || "Error");
    return NextResponse.json({ error: msg, origin: stack }, { status: 500 });
  }
}
