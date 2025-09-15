// src/app/api/ct/rivales/[id]/visibility/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

// Claves de visibilidad que soportamos
export type VisibilitySettings = {
  // Plan (informe visual)
  showSystem?: boolean;
  showKeyPlayers?: boolean;
  showStrengths?: boolean;
  showWeaknesses?: boolean;
  showSetPiecesFor?: boolean;
  showSetPiecesAgainst?: boolean;

  // Charla oficial (normalmente solo CT)
  showCharlaUrl?: boolean;

  // Videos
  showVideos?: boolean;

  // Stats
  showStatsTotalsGF?: boolean;
  showStatsTotalsGA?: boolean;
  showStatsTotalsPossession?: boolean;
  showStatsRecent?: boolean;

  // Notas internas (normalmente ocultas a jugadores)
  showNotesForPlayers?: boolean;
};

// Defaults sensatos (jugadores ven el informe visual, videos y stats; NO ven charla/nota interna)
function defaultVisibility(): Required<VisibilitySettings> {
  return {
    showSystem: true,
    showKeyPlayers: true,
    showStrengths: true,
    showWeaknesses: true,
    showSetPiecesFor: true,
    showSetPiecesAgainst: true,

    showCharlaUrl: false,

    showVideos: true,

    showStatsTotalsGF: true,
    showStatsTotalsGA: true,
    showStatsTotalsPossession: true,
    showStatsRecent: true,

    showNotesForPlayers: false,
  };
}

// Mantener solo claves conocidas y forzar booleano
function pickBooleans(input: any): VisibilitySettings {
  const defs = defaultVisibility();
  const out: VisibilitySettings = {};
  for (const k of Object.keys(defs) as (keyof VisibilitySettings)[]) {
    const v = input?.[k];
    if (typeof v === "boolean") (out as any)[k] = v;
  }
  return out;
}

// Merge con defaults (defaults <- saved <- patch)
function mergeVisibility(saved: any, patch?: VisibilitySettings): Required<VisibilitySettings> {
  const defs = defaultVisibility();
  const safeSaved = typeof saved === "object" && saved ? saved : {};
  const cleanPatch = pickBooleans(patch || {});
  return { ...defs, ...safeSaved, ...cleanPatch };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const r = await prisma.rival.findUnique({
      where: { id },
      select: { planVisibility: true },
    });
    if (!r) return new NextResponse("No encontrado", { status: 404 });

    const vis = mergeVisibility(r.planVisibility);
    return NextResponse.json({ data: vis });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json().catch(() => ({}));
    // Traemos lo actual para hacer merge tipo PATCH
    const current = await prisma.rival.findUnique({
      where: { id },
      select: { planVisibility: true },
    });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const merged = mergeVisibility(current.planVisibility, body);

    const row = await prisma.rival.update({
      where: { id },
      data: { planVisibility: merged as any },
      select: { planVisibility: true },
    });

    const data = mergeVisibility(row.planVisibility);
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
