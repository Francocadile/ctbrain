// src/app/api/ct/rivales/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const items = await prisma.rival.findMany({
      orderBy: [{ name: "asc" }],
    });

    const data = items.map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl ?? null,
      coach: r.coach ?? null,
      baseSystem: r.baseSystem ?? null,
      nextMatchDate: r.nextMatchDate ? r.nextMatchDate.toISOString() : null,
      nextMatchCompetition: r.nextMatchCompetition ?? null,
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return new NextResponse("name requerido", { status: 400 });

    // Campos opcionales
    const logoUrl = body?.logoUrl ?? null;
    const coach = body?.coach ?? null;
    const baseSystem = body?.baseSystem ?? null;
    const nextMatchDate =
      body?.nextMatchDate ? new Date(body.nextMatchDate) : null;
    const nextMatchCompetition = body?.nextMatchCompetition ?? null;

    // Upsert por nombre para evitar duplicados
    const row = await prisma.rival.upsert({
      where: { name },
      update: {
        logoUrl,
        coach,
        baseSystem,
        nextMatchDate,
        nextMatchCompetition,
      },
      create: {
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
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
