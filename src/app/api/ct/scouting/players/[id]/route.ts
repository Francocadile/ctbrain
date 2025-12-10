// src/app/api/ct/scouting/players/[id]/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const data = await prisma.scoutingPlayer.findFirst({ where: scopedWhere(team.id, { id: params.id }) as any });
    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("multitenant scouting player get error", err);
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const body = await req.json();
    const dataPatch: Prisma.ScoutingPlayerUpdateInput = {
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      positions: Array.isArray(body.positions) ? body.positions : undefined,
      club: body.club ?? undefined,
      estado: body.estado ?? undefined,

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
    };

    const updated = await prisma.scoutingPlayer.updateMany({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.ScoutingPlayerWhereInput,
      data: dataPatch,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const data = await prisma.scoutingPlayer.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as any,
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("multitenant scouting player put error", err);
    return NextResponse.json({ error: err?.message ?? "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const res = await prisma.scoutingPlayer.deleteMany({
      where: scopedWhere(team.id, { id: params.id }) as Prisma.ScoutingPlayerWhereInput,
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("multitenant scouting player delete error", err);
    return NextResponse.json({ error: err?.message ?? "Error al borrar" }, { status: 500 });
  }
}
