// src/app/api/ct/rivales/route.ts
import { NextResponse } from "next/server";
import type { Rival as RivalRow } from "@prisma/client";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/rivales  -> lista de rivales (ordenada)
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req });
    const items: RivalRow[] = await prisma.rival.findMany(
      scopedFindManyArgs(team.id, {
        orderBy: [{ name: "asc" }],
      }) as any,
    );

    const data = items.map((r: RivalRow) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl ?? null,
      coach: r.coach ?? null,
      baseSystem: r.baseSystem ?? null,
      nextMatchDate: r.nextMatchDate ? r.nextMatchDate.toISOString() : null,
      nextMatchCompetition: r.nextMatchCompetition ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rivales list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/rivales  -> crear (upsert por nombre para evitar duplicados)
export async function POST(req: Request) {
  try {
  const { prisma, team } = await dbScope({ req });
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return new NextResponse("name requerido", { status: 400 });

    const logoUrl = body?.logoUrl ?? null;
    const coach = body?.coach ?? null;
    const baseSystem = body?.baseSystem ?? null;
    const nextMatchDate = body?.nextMatchDate ? new Date(body.nextMatchDate) : null;
    const nextMatchCompetition = body?.nextMatchCompetition ?? null;

    const row = await prisma.rival.upsert({
      where: { teamId_name: { teamId: team.id, name } },
      update: {
        logoUrl,
        coach,
        baseSystem,
        nextMatchDate,
        nextMatchCompetition,
      },
      create: {
        teamId: team.id,
        name,
        logoUrl,
        coach,
        baseSystem,
        nextMatchDate,
        nextMatchCompetition,
      },
    });

    const data = {
      id: row.id,
      name: row.name,
      logoUrl: row.logoUrl ?? null,
      coach: row.coach ?? null,
      baseSystem: row.baseSystem ?? null,
      nextMatchDate: row.nextMatchDate ? row.nextMatchDate.toISOString() : null,
      nextMatchCompetition: row.nextMatchCompetition ?? null,
    };

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rivales create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
