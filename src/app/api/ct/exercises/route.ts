// src/app/api/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

// ====== Config de filas de contenido del editor (mismo set que usamos en la UI) ======
const CONTENT_ROWS = new Set(["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"]);

// ====== Marcadores usados por el editor semanal ======
const GRID_RE = /^\[GRID:(morning|afternoon):(.+?)\]/i;

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

// ========= EXTRAER DESDE BLOQUE [EXERCISES] <base64> EN DESCRIPTION =========
function extractFromSessionEXTag(
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
      id: `${s.id}__ex__${i}`, // id virtual estable
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

// ========= EXTRAER “EJERCICIOS VIRTUALES” DESDE CELDAS [GRID:turn:ROW] =========
function extractFromGridCell(
  s: { id: string; date: Date; description: string | null; title: string | null },
  userId: string
): VirtualExercise[] {
  const desc = (s.description || "").trim();
  if (!desc) return [];

  const m = desc.match(GRID_RE);
  if (!m) return [];

  const row = (m[2] || "").trim();
  // Solo filas de contenido (no meta: LUGAR, HORA, VIDEO, NOMBRE SESIÓN, etc.)
  if (!CONTENT_ROWS.has(row.toUpperCase())) return [];

  const text = (s.title || "").trim();
  if (!text) return [];

  // Tomamos la primera línea como posible "título" de ejercicio; fallback al nombre de la fila
  const firstLine = (text.split("\n")[0] || "").trim();
  const title = firstLine || row;

  return [
    {
      id: `${s.id}__grid__0`,
      userId,
      title,
      kind: { name: row }, // usamos la fila como "tipo"
      space: null,
      players: null,
      duration: null,
      description: text,
      imageUrl: null,
      tags: [],
      createdAt: s.date,
      updatedAt: s.date,
      sourceSessionId: s.id,
    },
  ];
}

/**
 * GET /api/exercises?q=&kind=&order=createdAt|title&dir=desc|asc&page=1&pageSize=20
 * Devuelve desde DB; si no hay, cae a “virtual”:
 *   1) bloque [EXERCISES] <base64> en description
 *   2) celdas del editor semanal [GRID:turn:ROW] para filas de contenido (FÍSICO, etc.)
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
      const sourceSessionId = (r as any).sessionId ?? fromId ?? null; // por compat
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

  let virtual: VirtualExercise[] = [];
  for (const s of sessions) {
    // 1) Bloque explícito [EXERCISES] <base64>
    virtual.push(...extractFromSessionEXTag(s, userId));

    // 2) Celdas del editor (GRID) consideradas como “ejercicios” de la sesión
    virtual.push(...extractFromGridCell(s, userId));
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
    const A = (order === "title" ? a.title : a.createdAt.getTime()) as any;
    const B = (order === "title" ? b.title : b.createdAt.getTime()) as any;
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
