// src/app/api/ct/scouting/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get("categoriaId") || undefined;
    const estado = searchParams.get("estado") || undefined;
    const q = searchParams.get("q") || undefined;

    const where: Prisma.ScoutingPlayerWhereInput = {};
    if (categoriaId) where.categoriaId = categoriaId;
    if (estado) where.estado = estado as any;
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { club: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }

    const data = await prisma.scoutingPlayer.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error al listar" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.fullName) {
      return NextResponse.json({ error: "fullName requerido" }, { status: 400 });
    }

    const data = await prisma.scoutingPlayer.create({
      data: {
        fullName: body.fullName,
        positions: Array.isArray(body.positions) ? body.positions : [],
        club: body.club ?? null,
        estado: body.estado ?? "ACTIVO",
        categoriaId: body.categoriaId ?? null,

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
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error al crear" }, { status: 500 });
  }
}
