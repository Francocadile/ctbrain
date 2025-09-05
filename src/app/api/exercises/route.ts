// src/app/api/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/exercises?q=&kind=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 *  - sin auth: lista todo; si pasás ?userId=... filtra por usuario
 * POST /api/exercises { title, userId, kindName?, space?, players?, duration?, description?, imageUrl?, tags? }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const kind = (url.searchParams.get("kind") || "").trim();
  const userId = (url.searchParams.get("userId") || "").trim() || undefined;
  const order = (url.searchParams.get("order") || "createdAt") as "createdAt" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  const where: any = {
    ...(userId ? { userId } : {}),
    ...(kind ? { kind: { name: { equals: kind } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { space: { contains: q, mode: "insensitive" } },
            { players: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.exercise.count({ where }),
    prisma.exercise.findMany({
      where,
      include: { kind: true },
      orderBy: { [order]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: rows,
    meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = (body?.title || "").trim();
  const userId = (body?.userId || "").trim();
  if (!title) return NextResponse.json({ error: "title requerido" }, { status: 400 });
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  let kindId: string | null = null;
  const kindName = (body?.kindName || "").trim();
  if (kindName) {
    const k = await prisma.exerciseKind.upsert({
      where: { name: kindName },
      update: {},
      create: { name: kindName },
    });
    kindId = k.id;
  }

  const created = await prisma.exercise.create({
    data: {
      userId,
      title,
      kindId,
      space: body?.space || null,
      players: body?.players || null,
      duration: body?.duration || null,
      description: body?.description || null,
      imageUrl: body?.imageUrl || null,
      tags: Array.isArray(body?.tags) ? body.tags.filter((x: any) => typeof x === "string") : [],
    },
    include: { kind: true },
  });

  return NextResponse.json({ data: created });
}
