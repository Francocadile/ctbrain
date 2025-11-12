// src/app/api/ct/rivales/[id]/plan/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireTeamIdFromRequest } from "@/lib/teamContext";
import { scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

// ---- Tipos de ayuda (no impactan la DB) ----
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

// ---- Utils de sanitización ----
function cleanString(v: unknown): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  return null;
}
function cleanStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  return [];
}

// ---- GET: devuelve plan (charla + reporte) del rival ----
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const teamId = await requireTeamIdFromRequest(req);
    const r = await prisma.rival.findFirst({
      where: scopedWhere(teamId, { id }) as any,
      select: {
        planCharlaUrl: true,
        planReport: true,
      },
    });
    if (!r) return new NextResponse("No encontrado", { status: 404 });

    const report = (r.planReport as RivalReport | null) || {};
    const data: RivalPlan = {
      charlaUrl: r.planCharlaUrl ?? null,
      report,
    };

    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// ---- PUT: guarda/actualiza el plan del rival ----
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const teamId = await requireTeamIdFromRequest(req);
    const current = await prisma.rival.findFirst({ where: scopedWhere(teamId, { id }) as any, select: { id: true } });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const body = (await req.json()) as RivalPlan | undefined;
    if (!body) return new NextResponse("body requerido", { status: 400 });

    const report: RivalReport = {
      system: cleanString(body.report?.system),
      strengths: cleanStringArray(body.report?.strengths),
      weaknesses: cleanStringArray(body.report?.weaknesses),
      keyPlayers: cleanStringArray(body.report?.keyPlayers),
      setPieces: {
        for: cleanStringArray(body.report?.setPieces?.for),
        against: cleanStringArray(body.report?.setPieces?.against),
      },
    };

    const row = await prisma.rival.update({
      where: { id },
      data: {
        planCharlaUrl: cleanString(body.charlaUrl),
        planReport: report as any, // Json en Prisma
      },
      select: {
        planCharlaUrl: true,
        planReport: true,
      },
    });

    const data: RivalPlan = {
      charlaUrl: row.planCharlaUrl ?? null,
      report: (row.planReport as RivalReport) || {},
    };

    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
