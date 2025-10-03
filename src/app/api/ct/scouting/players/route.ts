// src/app/api/ct/scouting/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoriaId = searchParams.get("categoriaId") || undefined;
  const q = searchParams.get("q")?.trim();
  const estado = searchParams.get("estado") || undefined;

  const data = await prisma.scoutingPlayer.findMany({
    where: {
      categoriaId,
      estado: estado as any | undefined,
      OR: q
        ? [
            { fullName: { contains: q, mode: "insensitive" } },
            { club: { contains: q, mode: "insensitive" } },
            { agentName: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.fullName) {
    return NextResponse.json({ error: "fullName requerido" }, { status: 400 });
  }
  // al menos un contacto
  const hasContact =
    body.agentPhone || body.agentEmail || body.playerPhone || body.playerEmail;
  if (!hasContact) {
    return NextResponse.json({ error: "Agregar contacto de agente o jugador" }, { status: 400 });
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
}
