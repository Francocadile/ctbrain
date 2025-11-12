// src/app/api/ct/rivales/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, type Rival as RivalRow } from "@prisma/client";
import { requireTeamIdFromRequest } from "@/lib/teamContext";
import { scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// Evitar múltiples clientes en dev/hot-reload
const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

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

    const teamId = await requireTeamIdFromRequest(req);
    const row = await prisma.rival.findFirst({ where: scopedWhere(teamId, { id }) as any });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    return NextResponse.json({ data: toDTO(row) });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
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

    const teamId = await requireTeamIdFromRequest(req);
    const current = await prisma.rival.findFirst({ where: scopedWhere(teamId, { id }) as any, select: { id: true } });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const row = await prisma.rival.update({
      where: { id },
      data: {
        name,
        logoUrl: body?.logoUrl ?? null,
        coach: body?.coach ?? null,
        baseSystem: body?.baseSystem ?? null,
        nextMatchDate: body?.nextMatchDate ? new Date(body.nextMatchDate) : null,
        nextMatchCompetition: body?.nextMatchCompetition ?? null,
      },
    });

    return NextResponse.json({ data: toDTO(row) });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
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

    const teamId = await requireTeamIdFromRequest(req);
    const current = await prisma.rival.findFirst({ where: scopedWhere(teamId, { id }) as any, select: { id: true } });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    await prisma.rival.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
