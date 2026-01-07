import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// PATCH /api/medico/protocols/stages/[id]
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
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

  const id = ctx.params.id;
  const body = await req.json().catch(() => ({} as any));

  const stage = await prisma.protocolStage.findFirst({
    where: { id, protocol: { teamId } },
    select: { id: true },
  });
  if (!stage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: any = {};
  if ("title" in body && typeof body.title === "string") {
    data.title = body.title.trim() || null;
  }
  if ("notes" in body && typeof body.notes === "string") {
    data.notes = body.notes.trim() || null;
  }
  if ("order" in body && typeof body.order === "number") {
    data.order = body.order;
  }
  if ("date" in body && typeof body.date === "string") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json({ error: "date inválida (YYYY-MM-DD)" }, { status: 400 });
    }
    const [y, m, d] = body.date.split("-").map(Number);
    data.date = new Date(y, (m || 1) - 1, d || 1);
  }

  await prisma.protocolStage.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/medico/protocols/stages/[id]
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
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

  const id = ctx.params.id;

  const stage = await prisma.protocolStage.findFirst({
    where: { id, protocol: { teamId } },
    select: { id: true },
  });
  if (!stage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.protocolBlock.deleteMany({ where: { stageId: id } });
  await prisma.protocolStage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
