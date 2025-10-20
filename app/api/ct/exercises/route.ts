// src/app/api/ct/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

// ====== Filas de contenido del editor (mismo set que usamos en la UI) ======
const CONTENT_ROWS = new Set(["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"]);

// ====== Marcador de celdas del editor semanal ======
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
  sourceSessionId: string | null;
};

// ========= 1) EXTRAER DESDE BLOQUE [EXERCISES] <base64> EN DESCRIPTION =========
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

// ========= 2) EXTRAER “EJERCICIOS VIRTUALES” DESDE CELDAS [GRID:turn:ROW] =========
function extractFromGridCell(
  s: { id: string; date: Date; description: string | null; title: string | null },
  userId: string
): VirtualExercise[] {
  const desc = (s.description || "").trim();
  if (!desc) return [];

  const m = desc.match(GRID_RE);
  if (!m) return [];

  const row = (m[2] || "").trim();
  // Solo filas de contenido (no meta)
  if (!CONTENT_ROWS.has(row.toUpperCase())) return [];

  const text = (s.title || "").trim();
  if (!text) return [];

  const firstLine = (text.split("\n")[0] || "").trim();
  const title = firstLine || row;

  return [
    {
      id: `${s.id}__grid__0`,
      userId,
      title,
      kind: { name: row },
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

  // ---------- A) Traer ejercicios en DB (si existen) ----------
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

  const rowsDb = await prisma.exercise.findMany({
    where,
    include: { kind: true },
    orderBy: { [order]: dir },
  });

  const dbMapped: VirtualExercise[] = rowsDb.map((r: any) => ({
    id: String(r.id),
    userId,
    title: String(r.title || ""),
    kind: r.kind ? { name: r.kind.name } : null,
    space: r.space ?? null,
    players: r.players ?? null,
    duration: r.duration ?? null,
    description: r.description ?? null,
    imageUrl: r.imageUrl ?? null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    sourceSessionId: (r as any).sessionId ?? null, // futuro: relación explícita
  }));

  // ---------- B) Fallback virtual desde sesiones (últimos 180 días) ----------
  const since = new Date();
  since.setDate(since.getDate() - 180);

  const sessions = await prisma.session.findMany({
    where: { createdBy: userId, date: { gte: since } },
    orderBy: { date: "desc" },
    select: { id: true, date: true, description: true, title: true },
    take: 500,
  });

  let virtual: VirtualExercise[] = [];
  for (const s of sessions) {
    virtual.push(...extractFromSessionEXTag(s, userId));
    virtual.push(...extractFromGridCell(s, userId));
  }

  // ---------- C) Unir DB + virtual y eliminar duplicados ----------
  const key = (e: VirtualExercise) =>
    `${e.sourceSessionId || "db"}::${(e.title || "").toLowerCase()}::${(e.kind?.name || "").toLowerCase()}`;

  const map = new Map<string, VirtualExercise>();
  for (const v of virtual) map.set(key(v), v); // primero virtual
  for (const d of dbMapped) map.set(key(d), d); // DB sobrescribe duplicados

  let combined = Array.from(map.values());

  // ---------- D) Filtros por q/kind ----------
  if (q) {
    const qi = q.toLowerCase();
    combined = combined.filter((r) => {
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
    combined = combined.filter((r) => (r.kind?.name || "").toLowerCase() === kindName);
  }

  // ---------- E) Orden ----------
  combined.sort((a, b) => {
    const A = order === "title" ? a.title : a.createdAt.getTime();
    const B = order === "title" ? b.title : b.createdAt.getTime();
    const cmp = A > B ? 1 : A < B ? -1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  // ---------- F) Paginación ----------
  const total = combined.length;
  const start = (page - 1) * pageSize;
  const data = combined.slice(start, start + pageSize);

  return NextResponse.json({
    data,
    meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}
