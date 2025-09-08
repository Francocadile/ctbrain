// src/app/api/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

// -------- helpers (node-safe base64 json) --------
function decodeB64Json<T = any>(b64: string): T | null {
  try {
    const s = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

type VirtualExercise = {
  id: string;
  userId: string;
  title: string;
  kind: { id?: string; name: string } | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  sourceSessionId: string;
};

function extractFromSession(
  s: { id: string; date: Date; description: string | null },
  userId: string
): VirtualExercise[] {
  const desc = (s.description || "").trim();
  const idx = desc.lastIndexOf(EX_TAG);
  if (idx === -1) return [];

  const rest = desc.slice(idx + EX_TAG.length).trim();
  const b64 = (rest.split(/\s+/)[0] || "").trim();
  if (!b64) return [];

  const arr = decodeB64Json<Array<Partial<VirtualExercise & { kind: string }>>>(b64);
  if (!Array.isArray(arr)) return [];

  return arr.map((e, i) => {
    const kindName = typeof (e as any)?.kind === "string" ? (e as any).kind : "";
    return {
      id: `${s.id}__${i}`, // id virtual estable
      userId,
      title: (e.title || "").trim() || `Ejercicio ${i + 1}`,
      kind: kindName ? { name: kindName } : null,
      space: (e as any)?.space ?? null,
      players: (e as any)?.players ?? null,
      duration: (e as any)?.duration ?? null,
      description: (e as any)?.description ?? null,
      imageUrl: (e as any)?.imageUrl ?? null,
      tags: Array.isArray((e as any)?.tags) ? ((e as any).tags as string[]) : [],
      createdAt: s.date,
      updatedAt: s.date,
      sourceSessionId: s.id,
    };
  });
}

/**
 * GET /api/exercises?q=&kind=&kindId=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 * Devuelve desde DB; si no hay, cae a “virtual” leyendo las sesiones con [EXERCISES] <base64>.
 */
export async function GET(req: Request) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const kindName = (url.searchParams.get("kind") || "").trim().toLowerCase() || undefined;
  const order = (url.searchParams.get("order") || "createdAt") as "createdAt" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  // ---------- Primero intentamos desde DB ----------
  const where: Prisma.ExerciseWhereInput = {
    userId,
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

  const totalDb = await prisma.exercise.count({ where });
  if (totalDb > 0) {
    const rowsDb = await prisma.exercise.findMany({
      where,
      include: { kind: true },
      orderBy: { [order]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const data = rowsDb.map((r: any) => {
      const fromId = typeof r.id === "string" && r.id.includes("__") ? r.id.split("__")[0] : null;
      const sourceSessionId = r.sessionId ?? fromId ?? null;
      return { ...r, sourceSessionId };
    });

    return NextResponse.json({
      data,
      meta: { total: totalDb, page, pageSize, pages: Math.max(1, Math.ceil(totalDb / pageSize)) },
    });
  }

  // ---------- Fallback: construir “virtual” desde sesiones ----------
  // Traemos un rango razonable (p. ej. últimos 180 días)
  const since = new Date();
  since.setDate(since.getDate() - 180);

  const sessions = await prisma.session.findMany({
    where: { createdBy: userId, date: { gte: since } },
    orderBy: { date: "desc" },
    select: { id: true, date: true, description: true, title: true },
    take: 500, // límite defensivo
  });

  // Extraer ejercicios del bloque [EXERCISES] de cada sesión
  let virtual: VirtualExercise[] = [];
  for (const s of sessions) {
    const items = extractFromSession(s, userId);
    virtual.push(...items);
  }

  // Filtros
  if (q) {
    const qi = q.toLowerCase();
    virtual = virtual.filter((r) => {
      const kind = r.kind?.name?.toLowerCase() || "";
      return (
        r.title.toLowerCase().includes(qi) ||
        (r.description || "").toLowerCase().includes(qi) ||
        (r.space || "").toLowerCase().includes(qi) ||
        (r.players || "").toLowerCase().includes(qi) ||
        kind.includes(qi)
      );
    });
  }
  if (kindName) {
    virtual = virtual.filter((r) => (r.kind?.name || "").toLowerCase() === kindName);
  }

  // Orden
  virtual.sort((a, b) => {
    const A = order === "title" ? a.title : a.createdAt.getTime();
    const B = order === "title" ? b.title : b.createdAt.getTime();
    const cmp = A > B ? 1 : A < B ? -1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  // Paginación
  const total = virtual.length;
  const start = (page - 1) * pageSize;
  const data = virtual.slice(start, start + pageSize);

  return NextResponse.json({
    data,
    meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}
