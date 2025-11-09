// src/app/api/search/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

type Row = {
  id: string;
  sessionId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  tags: string[];
};

export async function GET(req: Request) {
  // ⚠️ Sin authOptions para evitar los problemas de import — usa la configuración de /api/auth
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const order = (url.searchParams.get("order") || "date") as "date" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  // 1) Traemos las últimas sesiones del usuario (filtradas por creador)
  //    Si querés ampliar el 'take', ajustá el número.
  const sessions = await prisma.session.findMany({
    where: { createdBy: userId },
    orderBy: { date: "desc" },
    take: 500,
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      updatedAt: true,
    },
  });

  // Heurística simple para extraer metadatos desde la descripción
  const parseMeta = (txt?: string | null) => {
    const t = (txt || "").trim();
    const m = t.match(/(\d+)\s*min/i);
    const duration = m ? `${m[1]} minutos` : null;
    const players = /todos/i.test(t) ? "Todos" : null;
    const space =
      /gimnasio/i.test(t)
        ? "Gimnasio"
        : /cancha/i.test(t)
        ? "Cancha"
        : null;

    return { duration, players, space, description: t || null };
  };

  // 2) Convertimos cada Sesión a una fila tipo “ejercicio”
  let rows: Row[] = sessions.map((s) => {
    const meta = parseMeta(s.description);
    return {
      id: s.id,              // usamos el id de la sesión
      sessionId: s.id,       // para linkear al editor
      title: (s.title || "Sin título").trim(),
      createdAt: s.date,
      updatedAt: s.updatedAt,
      description: meta.description,
      space: meta.space,
      players: meta.players,
      duration: meta.duration,
      imageUrl: null,
      tags: [],
    };
  });

  // 3) Filtro de texto
  if (q) {
    rows = rows.filter((r) => {
      const hay =
        r.title.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.space || "").toLowerCase().includes(q) ||
        (r.players || "").toLowerCase().includes(q);
      return hay;
    });
  }

  // 4) Orden
  rows.sort((a, b) => {
    let A: number | string;
    let B: number | string;

    if (order === "title") {
      A = a.title;
      B = b.title;
    } else {
      A = a.createdAt.getTime();
      B = b.createdAt.getTime();
    }

    const cmp = A > B ? 1 : A < B ? -1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  // 5) Paginado
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const data = rows.slice(start, start + pageSize);

  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}
