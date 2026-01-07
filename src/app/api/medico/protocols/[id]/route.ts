import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function ensureCanRead(role: Role | undefined) {
  return !!role && (role === Role.MEDICO || role === Role.ADMIN || role === Role.CT);
}

function ensureCanWrite(role: Role | undefined) {
  return !!role && (role === Role.MEDICO || role === Role.ADMIN);
}

// GET /api/medico/protocols/[id]
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!ensureCanRead(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
  }

  const id = ctx.params.id;

  const p = await prisma.protocol.findFirst({
    where: { id, teamId },
    include: {
      player: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      clinicalEntry: {
        select: {
          id: true,
          date: true,
          status: true,
          diagnosis: true,
          bodyPart: true,
        },
      },
      stages: {
        include: { blocks: true },
        orderBy: [{ date: "asc" }, { order: "asc" }],
      },
    },
  });

  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stages = p.stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      date: s.date,
      title: s.title,
      order: s.order,
      notes: s.notes,
      blocks: s.blocks
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          id: b.id,
          order: b.order,
          type: b.type,
          content: b.content,
          intensity: b.intensity,
          volume: b.volume,
          notes: b.notes,
        })),
    }));

  return NextResponse.json({
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
    stages,
  });
}

// PATCH /api/medico/protocols/[id]
// Actualiza sólo metadatos (no etapas/bloques).
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!ensureCanWrite(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
  }

  const id = ctx.params.id;
  const body = await req.json().catch(() => ({} as any));

  const proto = await prisma.protocol.findFirst({ where: { id, teamId }, select: { id: true } });
  if (!proto) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: any = {};
  if ("title" in body && typeof body.title === "string") {
    data.title = body.title.trim() || null;
  }
  if ("injuryContext" in body && typeof body.injuryContext === "string") {
    data.injuryContext = body.injuryContext.trim() || null;
  }
  if ("status" in body && typeof body.status === "string") {
    data.status = body.status as any;
  }
  if ("clinicalEntryId" in body) {
    data.clinicalEntryId = typeof body.clinicalEntryId === "string" && body.clinicalEntryId
      ? body.clinicalEntryId
      : null;
  }

  await prisma.protocol.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/medico/protocols/[id]
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!ensureCanWrite(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const teamId = getCurrentTeamId(session);
  if (!teamId) {
    return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
  }

  const id = ctx.params.id;

  const proto = await prisma.protocol.findFirst({ where: { id, teamId }, select: { id: true } });
  if (!proto) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Borrado manual en cascada (bloques -> etapas -> protocolo)
  const stages = await prisma.protocolStage.findMany({ where: { protocolId: id }, select: { id: true } });
  const stageIds = stages.map((s) => s.id);

  if (stageIds.length > 0) {
    await prisma.protocolBlock.deleteMany({ where: { stageId: { in: stageIds } } });
    await prisma.protocolStage.deleteMany({ where: { id: { in: stageIds } } });
  }

  await prisma.protocol.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
