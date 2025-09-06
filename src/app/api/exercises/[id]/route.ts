// src/app/api/exercises/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import * as AuthRoute from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();
const authOptions: any = (AuthRoute as any).authOptions || (AuthRoute as any).default || undefined;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const row = await prisma.exercise.findFirst({
      where: { id: params.id, userId },
      include: { kind: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const body = await req.json().catch(() => ({}));
    const exists = await prisma.exercise.findFirst({ where: { id: params.id, userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.exercise.update({
      where: { id: params.id },
      data: {
        title: body?.title ?? exists.title,
        kindId: "kindId" in body ? body?.kindId ?? null : exists.kindId,
        space: "space" in body ? body?.space ?? null : exists.space,
        players: "players" in body ? body?.players ?? null : exists.players,
        duration: "duration" in body ? body?.duration ?? null : exists.duration,
        description: "description" in body ? body?.description ?? null : exists.description,
        imageUrl: "imageUrl" in body ? body?.imageUrl ?? null : exists.imageUrl,
        tags: Array.isArray(body?.tags) ? body.tags.filter((x: any) => typeof x === "string") : exists.tags,
        ...(body?.sessionId !== undefined ? { sessionId: body.sessionId } : {}),
      } as any,
      include: { kind: true },
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const exists = await prisma.exercise.findFirst({ where: { id: params.id, userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.exercise.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
