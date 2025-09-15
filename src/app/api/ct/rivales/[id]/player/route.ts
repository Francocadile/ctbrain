// src/app/api/ct/rivales/[id]/player/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

type RivalBasics = {
  id: string;
  name: string;
  logoUrl: string | null;
  coach?: string | null;
  baseSystem?: string | null;
  nextMatchDate?: string | null;        // ISO
  nextMatchCompetition?: string | null;
};

type RivalReport = {
  system?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  keyPlayers?: string[];
  setPieces?: {
    for?: string[];
    against?: string[];
  };
};

type RivalPlan = {
  charlaUrl: string | null;
  report: RivalReport;
};

type RivalVideo = { title?: string | null; url: string };

type RecentRow = {
  date?: string;
  opponent?: string;
  comp?: string;
  homeAway?: string; // H/A/N
  gf?: number;
  ga?: number;
};

type RivalStats = {
  totals?: { gf?: number; ga?: number; possession?: number };
  recent?: RecentRow[];
};

type NoteItem = { text: string; done?: boolean };
type RivalNotes = { observations?: string; checklist?: NoteItem[] };

type Visibility = {
  showSystem: boolean;
  showKeyPlayers: boolean;
  showStrengths: boolean;
  showWeaknesses: boolean;
  showSetPiecesFor: boolean;
  showSetPiecesAgainst: boolean;

  showCharlaUrl: boolean;

  showVideos: boolean;

  showStatsTotalsGF: boolean;
  showStatsTotalsGA: boolean;
  showStatsTotalsPossession: boolean;
  showStatsRecent: boolean;

  showNotesForPlayers: boolean;
};

function defaultVisibility(): Visibility {
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

function mergeVisibility(saved: any): Visibility {
  const defs = defaultVisibility();
  const out = { ...defs };
  if (saved && typeof saved === "object") {
    for (const k of Object.keys(defs) as (keyof Visibility)[]) {
      const v = saved[k];
      if (typeof v === "boolean") (out as any)[k] = v;
    }
  }
  return out;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const r = await prisma.rival.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        coach: true,
        baseSystem: true,
        nextMatchDate: true,
        nextMatchCompetition: true,

        planVisibility: true,
        planCharlaUrl: true,
        planReport: true,
        planVideos: true,
        planStats: true,
        planNotes: true,
      },
    });

    if (!r) return new NextResponse("No encontrado", { status: 404 });

    const vis = mergeVisibility(r.planVisibility);

    const basics: RivalBasics = {
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl ?? null,
      coach: r.coach ?? null,
      baseSystem: r.baseSystem ?? null,
      nextMatchDate: r.nextMatchDate ? r.nextMatchDate.toISOString() : null,
      nextMatchCompetition: r.nextMatchCompetition ?? null,
    };

    // Plan (aplicar visibilidad)
    const rawReport = (r.planReport as RivalReport) || {};
    const plan: RivalPlan = {
      charlaUrl: vis.showCharlaUrl ? (r.planCharlaUrl ?? null) : null,
      report: {
        system: vis.showSystem ? (rawReport.system ?? null) : null,
        keyPlayers: vis.showKeyPlayers ? (rawReport.keyPlayers ?? []) : [],
        strengths: vis.showStrengths ? (rawReport.strengths ?? []) : [],
        weaknesses: vis.showWeaknesses ? (rawReport.weaknesses ?? []) : [],
        setPieces: {
          for: vis.showSetPiecesFor ? (rawReport.setPieces?.for ?? []) : [],
          against: vis.showSetPiecesAgainst ? (rawReport.setPieces?.against ?? []) : [],
        },
      },
    };

    // Videos
    const videos: RivalVideo[] = vis.showVideos
      ? (Array.isArray(r.planVideos) ? (r.planVideos as any[]).map((v) => ({
          url: typeof v?.url === "string" ? v.url : "",
          title: typeof v?.title === "string" ? v.title : null,
        })).filter((x) => x.url) : [])
      : [];

    // Stats
    const rawStats = (r.planStats as RivalStats) || {};
    const stats: RivalStats = {
      totals: {
        gf: vis.showStatsTotalsGF ? rawStats?.totals?.gf : undefined,
        ga: vis.showStatsTotalsGA ? rawStats?.totals?.ga : undefined,
        possession: vis.showStatsTotalsPossession ? rawStats?.totals?.possession : undefined,
      },
      recent: vis.showStatsRecent ? (rawStats?.recent ?? []) : [],
    };

    // Notas (normalmente ocultas)
    const notes: RivalNotes = vis.showNotesForPlayers ? ((r.planNotes as RivalNotes) || { observations: "", checklist: [] }) : { observations: "", checklist: [] };

    const data = {
      basics,
      plan,
      videos,
      stats,
      notes,
      visibility: vis, // útil para la UI de previsualización
    };

    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
