import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/**
 * GET /api/exercises?q=&kindId=&kind=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 * POST /api/exercises { title, kindId?, space?, players?, duration?, description?, imageUrl?, tags? }
 */

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const kindId = (url.searchParams.get("kindId") || "").trim() || undefined;
  const kindName = (url.searchParams.get("kind") || "").trim() || undefined; // NUEVO: por nombre
  const order = (url.searchParams.get("order") || "createdAt") as "createdAt" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  const where: any = {
    userId,
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

  if (kindId) {
    where.kindId = kindId;
  } else if (kindName) {
    // filtra por nombre de la relación (case-insensitive)
    where.kind = { is: { name: { equals: kindName, mode: "insensitive" } } };
  }

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
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json().catch(() => ({}));
  const title = (body?.title || "").trim();
  if (!title) return NextResponse.json({ error: "title requerido" }, { status: 400 });

  const created = await prisma.exercise.create({
    data: {
      userId,
      title,
      kindId: body?.kindId || null,
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
