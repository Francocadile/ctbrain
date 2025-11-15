// src/app/api/ct/scouting/players/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedCreateArgs, scopedFindManyArgs, scopedWhere } from "@/lib/dbScope";

export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req });
    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get("categoriaId") || undefined;
    const estado = searchParams.get("estado") || undefined;
    const q = searchParams.get("q") || undefined;

    const where = scopedWhere(team.id, {} as Prisma.ScoutingPlayerWhereInput) as Prisma.ScoutingPlayerWhereInput;
    if (categoriaId) where.categoriaId = categoriaId;
    if (estado) where.estado = estado as any;
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { club: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }

    const data = await prisma.scoutingPlayer.findMany(
      scopedFindManyArgs(team.id, {
        where,
        orderBy: [{ updatedAt: "desc" }],
      }) as any,
    );

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("multitenant scouting players get error", err);
    return NextResponse.json({ error: err?.message ?? "Error al listar" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req });
    const body = await req.json();
    if (!body?.fullName) {
      return NextResponse.json({ error: "fullName requerido" }, { status: 400 });
    }

    let categoriaId: string | null = body.categoriaId ?? null;
    if (categoriaId) {
      const category = await prisma.scoutingCategory.findFirst({
        where: scopedWhere(team.id, { id: categoriaId }) as any,
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
      }
    }

    const data = await prisma.scoutingPlayer.create(
      scopedCreateArgs(team.id, {
        data: {
          fullName: body.fullName,
          positions: Array.isArray(body.positions) ? body.positions : [],
          club: body.club ?? null,
          estado: body.estado ?? "ACTIVO",
          categoriaId,

          agentName: body.agentName ?? null,
          agentPhone: body.agentPhone ?? null,
          agentEmail: body.agentEmail ?? null,
          playerPhone: body.playerPhone ?? null,
          playerEmail: body.playerEmail ?? null,
          instagram: body.instagram ?? null,

          videos: Array.isArray(body.videos) ? body.videos : [],
          notes: body.notes ?? null,
          rating: typeof body.rating === "number" ? body.rating : null,
          tags: Array.isArray(body.tags) ? body.tags : [],
        },
      }) as Prisma.ScoutingPlayerCreateArgs,
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("multitenant scouting players post error", err);
    return NextResponse.json({ error: err?.message ?? "Error al crear" }, { status: 500 });
  }
}
