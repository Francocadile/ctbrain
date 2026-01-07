import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/medico/protocols
// Lista protocolos del equipo actual, con filtros opcionales por playerId o clinicalEntryId.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!role || (role !== Role.MEDICO && role !== Role.ADMIN && role !== Role.CT)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
  }

  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId") || undefined;
  const clinicalEntryId = searchParams.get("clinicalEntryId") || undefined;

  const where: any = { teamId };
  if (playerId) where.playerId = playerId;
  if (clinicalEntryId) where.clinicalEntryId = clinicalEntryId;

  const rows = await prisma.protocol.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      player: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      clinicalEntry: {
        select: { id: true, date: true, status: true, diagnosis: true, bodyPart: true },
      },
    },
  });

  const data = rows.map((p) => ({
    id: p.id,
    teamId: p.teamId,
    playerId: p.playerId,
    playerName: p.player?.name || p.player?.email || "Jugador",
    createdById: p.createdById,
    createdByName: p.createdBy?.name || p.createdBy?.email || "Médico",
    clinicalEntryId: p.clinicalEntryId,
    clinicalSummary: p.clinicalEntry
      ? {
          id: p.clinicalEntry.id,
          date: p.clinicalEntry.date,
          status: p.clinicalEntry.status,
          diagnosis: p.clinicalEntry.diagnosis,
          bodyPart: p.clinicalEntry.bodyPart,
        }
      : null,
    title: p.title,
    injuryContext: p.injuryContext,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json({ items: data }, { headers: { "cache-control": "no-store" } });
}

// POST /api/medico/protocols
// Crea un nuevo protocolo vacío (sin etapas), asociado a un jugador y opcionalmente a un ClinicalEntry.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!role || (role !== Role.MEDICO && role !== Role.ADMIN)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
  }

  const body = await req.json().catch(() => ({} as any));
  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const clinicalEntryId = typeof body.clinicalEntryId === "string" ? body.clinicalEntryId : undefined;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const injuryContext = typeof body.injuryContext === "string" ? body.injuryContext.trim() : "";

  if (!playerId) {
    return NextResponse.json({ error: "playerId requerido" }, { status: 400 });
  }

  // Validar que el jugador pertenece al equipo actual
  const player = await prisma.user.findFirst({
    where: {
      id: playerId,
      teams: { some: { teamId } },
    },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ error: "El jugador no pertenece a tu equipo" }, { status: 403 });
  }

  // Si viene clinicalEntryId, validar que pertenece al mismo jugador + equipo
  let clinicalEntry = null as any;
  if (clinicalEntryId) {
    clinicalEntry = await prisma.clinicalEntry.findFirst({
      where: {
        id: clinicalEntryId,
        userId: playerId,
        user: { teams: { some: { teamId } } },
      },
      select: { id: true },
    });
    if (!clinicalEntry) {
      return NextResponse.json({ error: "clinicalEntryId inválido" }, { status: 400 });
    }
  }

  const created = await prisma.protocol.create({
    data: {
      teamId,
      playerId,
      clinicalEntryId: clinicalEntryId ?? null,
      createdById: session.user.id,
      title: title || null,
      injuryContext: injuryContext || null,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
