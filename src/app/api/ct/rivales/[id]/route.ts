// src/app/api/ct/rivales/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const r = await prisma.rival.findUnique({ where: { id } });
    if (!r) return new NextResponse("No encontrado", { status: 404 });

    const data = {
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl ?? null,
      coach: r.coach ?? null,
      baseSystem: r.baseSystem ?? null,
      nextMatchDate: r.nextMatchDate ? r.nextMatchDate.toISOString() : null,
      nextMatchCompetition: r.nextMatchCompetition ?? null,
    };

    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

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

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    await prisma.rival.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
