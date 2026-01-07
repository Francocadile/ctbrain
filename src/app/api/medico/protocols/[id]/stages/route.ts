import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/medico/protocols/[id]/stages
// Crea una nueva etapa para el protocolo.
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

  const protocolId = ctx.params.id;
  const body = await req.json().catch(() => ({} as any));

  const proto = await prisma.protocol.findFirst({ where: { id: protocolId, teamId }, select: { id: true } });
  if (!proto) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dateStr = typeof body.date === "string" ? body.date : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date inválida (YYYY-MM-DD)" }, { status: 400 });
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);

  const maxOrder = await prisma.protocolStage.aggregate({
    where: { protocolId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const created = await prisma.protocolStage.create({
    data: {
      protocolId,
      date,
      title: title || null,
      notes: notes || null,
      order: nextOrder,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
