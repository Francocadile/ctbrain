// src/app/api/ct/rivales/[id]/import/pdf/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

// Import dinàmico para evitar bundle innecesario en edge
async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as any;
  const data = await pdfParse(buffer);
  const text: string = data?.text || "";
  return text;
}

function pickFirst(lines: string[], re: RegExp): string | null {
  for (const l of lines) {
    const m = re.exec(l);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function extractBlock(text: string, headers: RegExp[], stopAt: RegExp, maxLines = 12): string[] {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headers.some(h => h.test(lines[i]))) { start = i + 1; break; }
  }
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start; i < lines.length && out.length < maxLines; i++) {
    const ln = lines[i];
    if (!ln || stopAt.test(ln)) break;
    out.push(ln.replace(/^[-•●]\s*/, "").trim());
  }
  return out.filter(Boolean);
}

function numNear(text: string, labels: RegExp[]): number | undefined {
  const lines = text.split(/\r?\n/);
  for (const l of lines) {
    if (labels.some(r => r.test(l))) {
      // capturar primer número (entero o %)
      const m = l.match(/(-?\d+([.,]\d+)?)/);
      if (m) {
        const raw = m[1].replace(",", ".");
        const v = Number(raw);
        if (Number.isFinite(v)) return v;
      }
    }
  }
  return undefined;
}

function sanitizeList(list: string[], limit = 10): string[] {
  return (list || [])
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, limit);
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
    const arrayBuf = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // 1) Texto del PDF
    const text = await parsePdf(buffer);
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 2) Heurísticas simples
    const coach =
      pickFirst(lines, /(Head\s*coach|Coach|Entrenador|DT)\s*[:\-]\s*(.+)/i) ||
      null;

    const baseSystem =
      pickFirst(lines, /(Formation|Sistema|Base|System)\s*[:\-]\s*([0-9\-]{3,})/i) ||
      pickFirst(lines, /^\s*([0-9]-[0-9]-[0-9](?:-[0-9])?)\s*$/i) ||
      null;

    const keyPlayers = sanitizeList(
      extractBlock(
        text,
        [/Key\s*players?/i, /Jugadores\s*clave/i],
        /(Strengths?|Weaknesses?|Fortalezas|Debilidades|Set\s*pieces|Bal[oó]n\s*parado)/i
      ),
      8
    );

    const strengths = sanitizeList(
      extractBlock(
        text,
        [/Strengths?/i, /Fortalezas/i],
        /(Weaknesses?|Debilidades|Key\s*players?|Jugadores\s*clave|Set\s*pieces|Bal[oó]n\s*parado)/i
      ),
      10
    );

    const weaknesses = sanitizeList(
      extractBlock(
        text,
        [/Weaknesses?/i, /Debilidades/i],
        /(Strengths?|Fortalezas|Key\s*players?|Jugadores\s*clave|Set\s*pieces|Bal[oó]n\s*parado)/i
      ),
      10
    );

    const setFor = sanitizeList(
      extractBlock(
        text,
        [/Set\s*pieces.*(for|a favor)/i, /Bal[oó]n\s*parado.*(a\s*favor)/i],
        /(against|en\s*contra|Weaknesses?|Debilidades|Strengths?|Fortalezas|Key\s*players?|Jugadores\s*clave)/i
      ),
      10
    );

    const setAgainst = sanitizeList(
      extractBlock(
        text,
        [/Set\s*pieces.*(against|en contra)/i, /Bal[oó]n\s*parado.*(en\s*contra)/i],
        /(for|a\s*favor|Weaknesses?|Debilidades|Strengths?|Fortalezas|Key\s*players?|Jugadores\s*clave)/i
      ),
      10
    );

    // 3) Totales básicos
    const gf = numNear(text, [/Goals\s*for\b/i, /\bGF\b/i, /Goles\s*a\s*favor/i]);
    const ga = numNear(text, [/Goals\s*against\b/i, /\bGA\b/i, /Goles\s*en\s*contra/i]);
    const possession = numNear(text, [/Possession\b/i, /Posesi[oó]n/i]);

    // 4) Construir patches
    const reportPatch: any = {
      system: baseSystem,
      strengths,
      weaknesses,
      keyPlayers,
      setPieces: { for: setFor, against: setAgainst },
    };

    const statsPatch: any = {
      totals: {
        gf,
        ga,
        possession,
      },
    };

    // 5) Persistir (merge suave sobre JSON existentes)
    const current = await prisma.rival.findUnique({
      where: { id },
      select: {
        coach: true,
        baseSystem: true,
        planReport: true,
        planStats: true,
      },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const mergedReport = {
      ...(current.planReport || {}),
      ...reportPatch,
      setPieces: {
        ...(current.planReport as any)?.setPieces,
        ...(reportPatch.setPieces || {}),
      },
    };

    const mergedStats = {
      ...(current.planStats || {}),
      totals: {
        ...(current.planStats as any)?.totals,
        ...(statsPatch.totals || {}),
      },
    };

    const row = await prisma.rival.update({
      where: { id },
      data: {
        coach: coach ?? current.coach,
        baseSystem: baseSystem ?? current.baseSystem,
        planReport: mergedReport as any,
        planStats: mergedStats as any,
      },
      select: {
        coach: true,
        baseSystem: true,
        planReport: true,
        planStats: true,
      },
    });

    return NextResponse.json({
      data: {
        applied: {
          coach: row.coach,
          baseSystem: row.baseSystem,
          report: row.planReport,
          stats: row.planStats,
        },
        rawHints: { coach, baseSystem, strengths, weaknesses, keyPlayers, setFor, setAgainst, gf, ga, possession },
      },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
