// src/app/api/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/**
 * GET /api/exercises?q=&kind=&kindId=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 * POST /api/exercises { title, kindId?, space?, players?, duration?, description?, imageUrl?, tags?, sessionId? }
 */

export async function GET(req: Request) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const kindId = (url.searchParams.get("kindId") || "").trim() || undefined;
  const kindName = (url.searchParams.get("kind") || "").trim() || undefined;
  const order = (url.searchParams.get("order") || "createdAt") as "createdAt" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  // --------- DB (Exercise)
  const where: Prisma.ExerciseWhereInput = {
    userId,
    ...(kindId ? { kindId } : {}),
    ...(kindName
      ? { kind: { is: { name: { equals: kindName, mode: "insensitive" as Prisma.QueryMode } } } }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            { description: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            { space: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            { players: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
          ],
        }
      : {}),
  };

  const [totalDb, rowsDb] = await Promise.all([
    prisma.exercise.count({ where }),
    prisma.exercise.findMany({
      where,
      include: { kind: true },
      orderBy: { [order]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Mapeo + sourceSessionId (por si el id es determinístico "sessionId__idx")
  const mapRow = (r: any) => {
    const fromId = typeof r.id === "string" && r.id.includes("__") ? r.id.split("__")[0] : null;
    const sourceSessionId = r.sessionId ?? fromId ?? null;
    return { ...r, sourceSessionId };
  };

  let data: any[] = (rowsDb || []).map(mapRow);

  // --------- Fallback: si aún no hay registros en Exercise, armamos vista virtual desde Session
  if (totalDb === 0) {
    const sessions = await prisma.session.findMany({
      where: { createdBy: userId },
      orderBy: { date: "desc" },
      take: 100,
      select: { id: true, date: true, title: true, description: true },
    });

    const derive = (txt?: string | null) => {
      const t = (txt || "").trim();
      const duration = (t.match(/(\d+)\s*min/i)?.[1] && `${t.match(/(\d+)\s*min/i)![1]} minutos`) || null;
      const players = /todos/i.test(t) ? "Todos" : null;
      const space = /gimnasio/i.test(t) ? "Gimnasio" : null;
      return { duration, players, space, description: t || null };
    };

    let virtual = sessions.map((s, i) => {
      const g = derive(s.description);
      return {
        id: `${s.id}__0`,
        userId,
        title: (s.title || "Sin título").trim(),
        createdAt: s.date,
        updatedAt: s.date,
        kindId: null,
        kind: null,
        space: g.space,
        players: g.players,
        duration: g.duration,
        description: g.description,
        imageUrl: null,
        tags: [] as string[],
        sourceSessionId: s.id,
      };
    });

    // Filtros/orden/paginado sobre virtual
    if (q) {
      const qi = q.toLowerCase();
      virtual = virtual.filter(
        (r) =>
          r.title.toLowerCase().includes(qi) ||
          (r.description || "").toLowerCase().includes(qi) ||
          (r.space || "").toLowerCase().includes(qi) ||
          (r.players || "").toLowerCase().includes(qi)
      );
    }
    if (kindName) {
      // En virtual no hay tipos, así que lo ignoramos (o podrías inferir)
    }

    virtual.sort((a, b) => {
      const A = order === "title" ? a.title : new Date(a.createdAt).getTime();
      const B = order === "title" ? b.title : new Date(b.createdAt).getTime();
      return (A > B ? 1 : A < B ? -1 : 0) * (dir === "asc" ? 1 : -1);
    });

    const total = virtual.length;
    const start = (page - 1) * pageSize;
    data = virtual.slice(start, start + pageSize);

    return NextResponse.json({
      data,
      meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  }

  return NextResponse.json({
    data,
    meta: { total: totalDb, page, pageSize, pages: Math.max(1, Math.ceil(totalDb / pageSize)) },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      sessionId: body?.sessionId ?? null, // si existe el campo en tu schema
    } as any,
    include: { kind: true },
  });

  const fromId = typeof created.id === "string" && created.id.includes("__") ? created.id.split("__")[0] : null;
  const sourceSessionId = (created as any).sessionId ?? fromId ?? null;

  return NextResponse.json({ data: { ...created, sourceSessionId } });
}
