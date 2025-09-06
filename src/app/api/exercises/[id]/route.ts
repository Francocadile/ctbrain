// src/app/api/exercises/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import * as Auth from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

// Tomamos authOptions si existe (ya sea export nombrado o default). Evita romper en build.
const authOptions: any = (Auth as any)?.authOptions ?? (Auth as any)?.default ?? undefined;

async function getUserId(): Promise<string | null> {
  try {
    // Cast explícito para que TS no marque session como {}
    const session = (await getServerSession(authOptions as any)) as any;
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;

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
        // si tu schema tiene sessionId, actualizamos; si no, Prisma ignora propiedad extra
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
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const exists = await prisma.exercise.findFirst({ where: { id: params.id, userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.exercise.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
