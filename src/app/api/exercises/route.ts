import { NextResponse } from "next/server";
import { PrismaClient, type Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/**
 * GET /api/exercises?q=&kindId=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 * POST /api/exercises { title, kindId?, space?, players?, duration?, description?, imageUrl?, tags? }
 */

export async function GET(req: Request) {
  // Sin authOptions para evitar problemas de export
  const session = await getServerSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = String(session.user.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const kindId = (url.searchParams.get("kindId") || "").trim() || undefined;
  const order = (url.searchParams.get("order") || "createdAt") as
    | "createdAt"
    | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    50,
    Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );

  // Construimos el where CON TIPO explícito de Prisma para que `mode` valide
  const where: Prisma.ExerciseWhereInput = { userId };

  if (kindId) where.kindId = kindId;

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { space: { contains: q, mode: "insensitive" } },
      { players: { contains: q, mode: "insensitive" } },
    ];
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

  // Añadimos `sourceSessionId` derivado del id determinístico "<sessionId>__<idx>"
  const data = rows.map((r: any) => {
    let sourceSessionId: string | null = null;
    if (typeof r.id === "string" && r.id.includes("__")) {
      sourceSessionId = r.id.split("__")[0];
    }
    return { ...r, sourceSessionId };
  });

  return NextResponse.json({
    data,
    meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = String(session.user.id);

  const body = await req.json().catch(() => ({}));
  const title = (body?.title || "").trim();
  if (!title)
    return NextResponse.json({ error: "title requerido" }, { status: 400 });

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
      tags: Array.isArray(body?.tags)
        ? body.tags.filter((x: any) => typeof x === "string")
        : [],
    },
    include: { kind: true },
  });

  let sourceSessionId: string | null = null;
  if (typeof created.id === "string" && created.id.includes("__")) {
    sourceSessionId = created.id.split("__")[0];
  }

  return NextResponse.json({ data: { ...created, sourceSessionId } });
}
