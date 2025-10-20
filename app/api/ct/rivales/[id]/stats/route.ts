// src/app/api/ct/rivales/[id]/stats/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

type RecentRow = {
  date?: string;         // ISO
  opponent?: string;
  comp?: string;
  homeAway?: string;     // H/A
  gf?: number;
  ga?: number;
};

export type RivalStats = {
  totals?: {
    gf?: number;
    ga?: number;
    possession?: number; // %
  };
  recent?: RecentRow[];
};

function num(n: any): number | undefined {
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}

function sanitize(body: any): RivalStats {
  const totalsIn = body?.totals ?? {};
  const totals = {
    gf: num(totalsIn?.gf),
    ga: num(totalsIn?.ga),
    possession: num(totalsIn?.possession),
  };

  const recentIn = Array.isArray(body?.recent) ? body.recent : [];
  const recent: RecentRow[] = [];
  for (const r of recentIn.slice(0, 30)) {
    const row: RecentRow = {
      date: typeof r?.date === "string" && r.date ? r.date : undefined,
      opponent: typeof r?.opponent === "string" ? r.opponent.trim() : undefined,
      comp: typeof r?.comp === "string" ? r.comp.trim() : undefined,
      homeAway:
        typeof r?.homeAway === "string" && ["H", "A", "N"].includes(r.homeAway.toUpperCase())
          ? r.homeAway.toUpperCase()
          : undefined,
      gf: num(r?.gf),
      ga: num(r?.ga),
    };
    if (row.date || row.opponent || Number.isFinite(row.gf as number) || Number.isFinite(row.ga as number)) {
      recent.push(row);
    }
  }

  return { totals, recent };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const r = await prisma.rival.findUnique({
      where: { id },
      select: { planStats: true },
    });
    if (!r) return new NextResponse("No encontrado", { status: 404 });

    const stats = (r.planStats as RivalStats) || {};
    return NextResponse.json({ data: stats });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json();
    const clean = sanitize(body);

    const row = await prisma.rival.update({
      where: { id },
      data: { planStats: clean as any },
      select: { planStats: true },
    });

    return NextResponse.json({ data: (row.planStats as RivalStats) || {} });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
