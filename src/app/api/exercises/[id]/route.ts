// src/app/api/exercises/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const row = await prisma.exercise.findUnique({
    where: { id: params.id },
    include: { kind: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const exists = await prisma.exercise.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let kindId = exists.kindId;
  if ("kindName" in body) {
    const name = String(body?.kindName || "").trim();
    if (name) {
      const k = await prisma.exerciseKind.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      kindId = k.id;
    } else {
      kindId = null;
    }
  }

  const updated = await prisma.exercise.update({
    where: { id: params.id },
    data: {
      title: (body?.title ?? exists.title),
      kindId,
      space: "space" in body ? body?.space ?? null : exists.space,
      players: "players" in body ? body?.players ?? null : exists.players,
      duration: "duration" in body ? body?.duration ?? null : exists.duration,
      description: "description" in body ? body?.description ?? null : exists.description,
      imageUrl: "imageUrl" in body ? body?.imageUrl ?? null : exists.imageUrl,
      tags: Array.isArray(body?.tags) ? body.tags.filter((x: any) => typeof x === "string") : exists.tags,
    },
    include: { kind: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const exists = await prisma.exercise.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.exercise.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
