import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ProtocolBlockType, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// PATCH /api/medico/protocols/blocks/[id]
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

  const block = await prisma.protocolBlock.findFirst({
    where: { id, stage: { protocol: { teamId } } },
    select: { id: true },
  });
  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: any = {};
  if ("content" in body && typeof body.content === "string") {
    data.content = body.content.trim();
  }
  if ("intensity" in body && typeof body.intensity === "string") {
    data.intensity = body.intensity.trim() || null;
  }
  if ("volume" in body && typeof body.volume === "string") {
    data.volume = body.volume.trim() || null;
  }
  if ("notes" in body && typeof body.notes === "string") {
    data.notes = body.notes.trim() || null;
  }
  if ("order" in body && typeof body.order === "number") {
    data.order = body.order;
  }
  if ("type" in body && typeof body.type === "string") {
    const rawType = body.type as string;
    if ((Object.values(ProtocolBlockType) as string[]).includes(rawType)) {
      data.type = rawType as ProtocolBlockType;
    }
  }

  await prisma.protocolBlock.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/medico/protocols/blocks/[id]
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

  const block = await prisma.protocolBlock.findFirst({
    where: { id, stage: { protocol: { teamId } } },
    select: { id: true },
  });
  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.protocolBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
