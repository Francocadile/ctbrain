// src/app/api/ct/scouting/players/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.scoutingPlayer.findUnique({ where: { id: params.id } });
    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data = await prisma.scoutingPlayer.update({
      where: { id: params.id },
      data: {
        fullName: typeof body.fullName === "string" ? body.fullName : undefined,
        positions: Array.isArray(body.positions) ? body.positions : undefined,
        club: body.club ?? undefined,
        estado: body.estado ?? undefined,
        categoriaId: body.categoriaId ?? undefined,

        agentName: body.agentName ?? undefined,
        agentPhone: body.agentPhone ?? undefined,
        agentEmail: body.agentEmail ?? undefined,
        playerPhone: body.playerPhone ?? undefined,
        playerEmail: body.playerEmail ?? undefined,
        instagram: body.instagram ?? undefined,

        videos: Array.isArray(body.videos) ? body.videos : undefined,
        notes: body.notes ?? undefined,
        rating: typeof body.rating === "number" ? body.rating : undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
      },
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    if (msg.includes("Record to update not found")) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: err?.message ?? "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await prisma.scoutingPlayer.deleteMany({ where: { id: params.id } });
    if (res.count === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error al borrar" }, { status: 500 });
  }
}
