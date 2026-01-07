import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ProtocolBlockType, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/medico/protocols/stages/[id]/blocks
// Crea un bloque dentro de una etapa.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
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

  const stageId = ctx.params.id;
  const body = await req.json().catch(() => ({} as any));

  const stage = await prisma.protocolStage.findFirst({
    where: { id: stageId, protocol: { teamId } },
    select: { id: true },
  });
  if (!stage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawType = typeof body.type === "string" ? body.type : "OTHER";
  const type = (Object.values(ProtocolBlockType) as string[]).includes(rawType)
    ? (rawType as ProtocolBlockType)
    : ProtocolBlockType.OTHER;

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const intensity = typeof body.intensity === "string" ? body.intensity.trim() : "";
  const volume = typeof body.volume === "string" ? body.volume.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "content requerido" }, { status: 400 });
  }

  const maxOrder = await prisma.protocolBlock.aggregate({
    where: { stageId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const created = await prisma.protocolBlock.create({
    data: {
      stageId,
      order: nextOrder,
      type,
      content,
      intensity: intensity || null,
      volume: volume || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
