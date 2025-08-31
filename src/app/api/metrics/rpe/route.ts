// src/app/api/metrics/rpe/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toUTCStart(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

function classifyAU(au: number | null | undefined) {
  if (au == null) return { band: "ND", color: "gray", label: "Sin datos" };
  if (au < 400) return { band: "LIGERA", color: "green", label: "<400 AU" };
  if (au < 700) return { band: "MODERADA", color: "yellow", label: "400–700 AU" };
  if (au < 1000) return { band: "ALTA", color: "orange", label: "700–1000 AU" };
  return { band: "MUY ALTA", color: "red", label: ">1000 AU" };
}

// GET /api/metrics/rpe?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=...&sessionId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId") || undefined;
    const sessionId = url.searchParams.get("sessionId") || undefined;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = toUTCStart(from);
      if (to) { const end = toUTCStart(to); end.setUTCDate(end.getUTCDate() + 1); where.date.lt = end; }
    }
    if (userId) where.userId = userId;
    if (sessionId) where.sessionId = sessionId;

    const rows = await prisma.rPEEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { userId: "asc" }],
    });

    // enriquecemos con AU (sRPE) y categoría
    const enriched = rows.map(r => {
      const load = r.load ?? (r.duration != null ? r.rpe * r.duration : null);
      const cat = classifyAU(load ?? null);
      return { ...r, load, category: cat };
    });

    return NextResponse.json(enriched);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// POST (lo envía el jugador) — crea RPE; duración la pone CT luego
// Body: { userId, date(YYYY-MM-DD), rpe(0-10), sessionId? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "");
    const date = String(body?.date || "");
    if (!userId || !date) return new NextResponse("userId y date requeridos", { status: 400 });

    const d = toUTCStart(date);
    const rpe = Math.max(0, Math.min(10, Number(body?.rpe ?? 0)));
    const sessionId = body?.sessionId ? String(body?.sessionId) : null;

    const data = await prisma.rPEEntry.create({
      data: { userId, date: d, rpe, duration: null, load: null, sessionId },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
