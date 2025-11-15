// src/app/api/ct/rivales/[id]/route.ts
import { NextResponse } from "next/server";
import type { Rival as RivalRow } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

function toDTO(r: RivalRow) {
  return {
    id: r.id,
    name: r.name,
    logoUrl: r.logoUrl ?? null,
    coach: r.coach ?? null,
    baseSystem: r.baseSystem ?? null,
    nextMatchDate: r.nextMatchDate ? r.nextMatchDate.toISOString() : null,
    nextMatchCompetition: r.nextMatchCompetition ?? null,
  };
}

// GET /api/ct/rivales/:id
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const { prisma, team } = await dbScope({ req });
    const row = await prisma.rival.findFirst({ where: scopedWhere(team.id, { id }) as any });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    return NextResponse.json({ data: toDTO(row) });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival show error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}

// PUT /api/ct/rivales/:id
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return new NextResponse("name requerido", { status: 400 });

    const { prisma, team } = await dbScope({ req });
    const result = await prisma.rival.updateMany({
      where: { id, teamId: team.id },
      data: {
        name,
        logoUrl: body?.logoUrl ?? null,
        coach: body?.coach ?? null,
        baseSystem: body?.baseSystem ?? null,
        nextMatchDate: body?.nextMatchDate ? new Date(body.nextMatchDate) : null,
        nextMatchCompetition: body?.nextMatchCompetition ?? null,
      },
    });
    if (result.count === 0) return new NextResponse("No encontrado", { status: 404 });

    const row = await prisma.rival.findFirst({ where: scopedWhere(team.id, { id }) as any });
    return NextResponse.json({ data: row ? toDTO(row) : null });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival update error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}

// DELETE /api/ct/rivales/:id
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const { prisma, team } = await dbScope({ req });
    const deleted = await prisma.rival.deleteMany({ where: { id, teamId: team.id } });
    if (deleted.count === 0) return new NextResponse("No encontrado", { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival delete error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}
