import { NextResponse } from "next/server";
import { PrismaClient, type Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/**
 * GET /api/exercises?q=&kindId=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 * POST /api/exercises { title, kindId?, space?, players?, duration?, description?, imageUrl?, tags? }
 */

export async function GET(req: Request) {
  const session = await getServerSession(); // sin authOptions para evitar export issues
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

  // --- 1) Intento con tabla Exercise
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

  let data: any[] = (rowsDb || []).map((r) => {
    let sourceSessionId: string | null = null;
    if (typeof r.id === "string" && r.id.includes("__")) {
      // ids determinísticos "sessionId__idx"
      sourceSessionId = r.id.split("__")[0];
    }
    return { ...r, sourceSessionId };
  });

  // --- 2) Fallback: si no hay nada en Exercise, generamos vista desde Sesiones
  if (totalDb === 0) {
    // Tomamos últimas 100 sesiones del usuario
    const sessions = await prisma.session.findMany({
      where: { createdBy: userId },
      orderBy: { date: "desc" },
      take: 100,
      select: {
        id: true,
        date: true,
        title: true,
        description: true,
        // si tu schema tuviera más campos útiles para el ejercicio, agrégalos aquí
      },
    });

    const guess = (txt?: string | null) => {
      const t = (txt || "").trim();
      const duration =
        (t.match(/(\d+)\s*min/i)?.[1] && `${t.match(/(\d+)\s*min/i)![1]} minutos`) ||
        null;
      const players = /todos/i.test(t) ? "Todos" : null;
      const space = /gimnasio/i.test(t) ? "Gimnasio" : null;
      return { duration, players, space, description: t || null };
    };

    const virtual = sessions.map((s, idx) => {
      const g = guess(s.description);
      return {
        id: `${s.id}__1`, // determinístico
        userId,
        title: s.title?.trim() || "Sin título",
        createdAt: s.date,
        updatedAt: s.date,
        kindId: null,
        kind: null,
        space: g.space,
        players: g.players,
        duration: g.duration,
        description: g.description,
        imageUrl: null,
        tags: [],
        sourceSessionId: s.id, // clave para linkear al editor
      };
    });

    // Paginamos el virtual localmente
    let list = virtual;
    // filtros
    if (q) {
      const qi = q.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(qi) ||
          (r.description || "").toLowerCase().includes(qi) ||
          (r.space || "").toLowerCase().includes(qi) ||
          (r.players || "").toLowerCase().includes(qi)
      );
    }
    // orden
    list.sort((a, b) => {
      const A = order === "title" ? a.title : new Date(a.createdAt).getTime();
      const B = order === "title" ? b.title : new Date(b.createdAt).getTime();
      // @ts-ignore
      return (A > B ? 1 : A < B ? -1 : 0) * (dir === "asc" ? 1 : -1);
    });

    const total = list.length;
    const start = (page - 1) * pageSize;
    data = list.slice(start, start + pageSize);

    return NextResponse.json({
      data,
      meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  }

  // Respuesta normal con tabla Exercise
  return NextResponse.json({
    data,
    meta: {
      total: totalDb,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(totalDb / pageSize)),
    },
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
