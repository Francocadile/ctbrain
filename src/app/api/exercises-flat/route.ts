import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

const EX_TAG = "[EXERCISES]";

type TurnKey = "morning" | "afternoon";
type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
};

// --- helpers para leer tu formato ---
function parseMarker(description?: string) {
  const text = (description || "").trimStart();
  const m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  return { turn: (m?.[1] || "") as TurnKey | "", row: m?.[2] || "", ymd: m?.[3] || "" };
}

function decodeExercises(desc: string | null | undefined): Exercise[] {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return [];
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    const arr = JSON.parse(json) as Partial<Exercise>[];
    if (!Array.isArray(arr)) return [];
    return arr.map((e) => ({
      title: e.title ?? "",
      kind: e.kind ?? "",
      space: e.space ?? "",
      players: e.players ?? "",
      duration: e.duration ?? "",
      description: e.description ?? "",
      imageUrl: e.imageUrl ?? "",
    }));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const kind = (url.searchParams.get("kind") || "").trim().toLowerCase();
  const order = (url.searchParams.get("order") || "date") as "date" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  // Traemos un rango razonable de sesiones (ajustable)
  const sessions = await prisma.session.findMany({
    where: { createdBy: userId },
    orderBy: { date: "desc" },
    take: 500, // suficiente para historial reciente
    select: { id: true, title: true, description: true, date: true, type: true },
  });

  // Aplanado
  let flat = sessions.flatMap((s) => {
    const marker = parseMarker(s.description || "");
    const list = decodeExercises(s.description || "");
    return list.map((ex, idx) => ({
      id: `${s.id}__${idx}`,            // id virtual
      title: ex.title || marker.row || s.title || "Sin título",
      kind: ex.kind || "",
      space: ex.space || "",
      players: ex.players || "",
      duration: ex.duration || "",
      description: ex.description || "",
      imageUrl: ex.imageUrl || "",
      createdAt: s.date,
      sessionId: s.id,
      turn: marker.turn,
      row: marker.row,
      ymd: marker.ymd,
      idx,
      sessionType: s.type,
    }));
  });

  // Filtros
  if (q) {
    flat = flat.filter((r) => {
      const hay = (v: string) => (v || "").toLowerCase().includes(q);
      return (
        hay(r.title) ||
        hay(r.description) ||
        hay(r.space) ||
        hay(r.players) ||
        hay(r.duration) ||
        hay(r.kind)
      );
    });
  }
  if (kind) {
    flat = flat.filter((r) => (r.kind || "").toLowerCase() === kind);
  }

  // Orden
  flat.sort((a, b) => {
    const A = order === "title" ? a.title : new Date(a.createdAt).getTime();
    const B = order === "title" ? b.title : new Date(b.createdAt).getTime();
    const cmp = A > B ? 1 : A < B ? -1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  // Paginado
  const total = flat.length;
  const start = (page - 1) * pageSize;
  const data = flat.slice(start, start + pageSize);

  return NextResponse.json({
    data,
    meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}
