// src/app/api/exercises/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.exercise.findFirst({
    where: { id: params.id, userId },
    include: { kind: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fromId = typeof row.id === "string" && row.id.includes("__") ? row.id.split("__")[0] : null;
  const sourceSessionId = (row as any).sessionId ?? fromId ?? null;

  return NextResponse.json({ data: { ...row, sourceSessionId } });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const exists = await prisma.exercise.findFirst({ where: { id: params.id, userId } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.exercise.update({
    where: { id: params.id },
    data: {
      title: (body?.title ?? exists.title),
      kindId: "kindId" in body ? body?.kindId ?? null : exists.kindId,
      space: "space" in body ? body?.space ?? null : exists.space,
      players: "players" in body ? body?.players ?? null : exists.players,
      duration: "duration" in body ? body?.duration ?? null : exists.duration,
      description: "description" in body ? body?.description ?? null : exists.description,
      imageUrl: "imageUrl" in body ? body?.imageUrl ?? null : exists.imageUrl,
      sessionId: "sessionId" in body ? body?.sessionId ?? null : (exists as any).sessionId ?? null,
      tags: Array.isArray(body?.tags) ? body.tags.filter((x: any) => typeof x === "string") : exists.tags,
    } as any,
    include: { kind: true },
  });

  const fromId = typeof updated.id === "string" && updated.id.includes("__") ? updated.id.split("__")[0] : null;
  const sourceSessionId = (updated as any).sessionId ?? fromId ?? null;

  return NextResponse.json({ data: { ...updated, sourceSessionId } });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exists = await prisma.exercise.findFirst({ where: { id: params.id, userId } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.exercise.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
