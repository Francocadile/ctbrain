import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { readExercisesFromDescription } from "@/lib/exercises-serialization";

const EX_TAG = "[EXERCISES]";

function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getUserTeamIdOrNull(userId: string): Promise<string | null> {
  const ut = await prisma.userTeam.findFirst({
    where: { userId },
    select: { teamId: true },
    orderBy: { createdAt: "asc" },
  });
  return ut?.teamId ?? null;
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  const teamId = await getUserTeamIdOrNull(auth.user.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const kind = (url.searchParams.get("kind") || "").trim().toLowerCase();
  const order = (url.searchParams.get("order") || "date") as "date" | "title";
  const dir = (url.searchParams.get("dir") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10)));

  // Traemos sesiones del equipo o del usuario
  const sessions = await prisma.session.findMany({
    where: {
      ...(teamId ? { teamId } : { createdBy: auth.user.id }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: { id: true, title: true, description: true, date: true, type: true, createdAt: true },
  });

  // --- Legacy: bloque [EXERCISES] base64 ---
  function parseMarker(description?: string) {
    const text = (description || "").trimStart();
    const m = text.match(/\[GRID:(morning|afternoon):(.+?)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
    return { turn: (m?.[1] || "") as string, row: m?.[2] || "", ymd: m?.[3] || "" };
  }
  function decodeExercises(desc: string | null | undefined) {
    const text = (desc || "").trimEnd();
    const idx = text.lastIndexOf(EX_TAG);
    if (idx === -1) return [];
    const rest = text.slice(idx + EX_TAG.length).trim();
    const b64 = rest.split(/\s+/)[0] || "";
    try {
      const json = Buffer.from(b64, "base64").toString("utf8");
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return [];
      return arr.map((e, idx) => ({
        title: e.title ?? "",
        kind: e.kind ?? "",
        space: e.space ?? "",
        players: e.players ?? "",
        duration: e.duration ?? "",
        description: e.description ?? "",
        imageUrl: e.imageUrl ?? "",
        createdAt: null,
        sessionId: null,
        turn: null,
        row: null,
        ymd: null,
        idx,
        sessionType: null,
      }));
    } catch {
      return [];
    }
  }
  let flatLegacy = sessions.flatMap((s) => {
    const marker = parseMarker(s.description || "");
    const list = decodeExercises(s.description || "");
    return list.map((ex, idx) => ({
      id: `${s.id}__${idx}`,
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

  // --- Nuevo: JSON __ctb_ex__ ---
  const jsonLinksBySession = {} as Record<string, { exId: string; order: number; note?: string }[]>;
  const jsonExerciseIds = new Set<string>();
  for (const s of sessions) {
    const links = readExercisesFromDescription(s.description);
    if (links.length > 0) {
      jsonLinksBySession[s.id] = links.map((l, i) => ({
        exId: l.id,
        order: typeof l.order === "number" ? l.order : i,
        note: l.note ?? "",
      }));
      links.forEach(l => jsonExerciseIds.add(l.id));
    }
  }
  let jsonExercises: { [id: string]: any } = {};
  if (jsonExerciseIds.size > 0) {
    const exList = await prisma.exercise.findMany({
      where: {
        id: { in: Array.from(jsonExerciseIds) },
        OR: [
          ...(teamId ? [{ teamId }] : []),
          { userId: auth.user.id },
        ],
      },
      include: { kind: true },
    });
    jsonExercises = Object.fromEntries(exList.map(e => [e.id, e]));
  }
  const flatFromJSON: any[] = [];
  for (const s of sessions) {
    const links = jsonLinksBySession[s.id];
    if (!links) continue;
    for (const link of links) {
      const ex = jsonExercises[link.exId];
      if (!ex) continue;
      flatFromJSON.push({
        id: ex.id,
        title: ex.title,
        kind: ex.kind?.name ?? null,
        space: ex.space ?? null,
        players: ex.players ?? null,
        duration: ex.duration ?? null,
        description: ex.description ?? null,
        imageUrl: ex.imageUrl ?? null,
        createdAt: ex.createdAt,
        sessionId: s.id,
        sessionTitle: s.title ?? null,
        turn: null,
        row: null,
        ymd: toYYYYMMDDUTC(new Date(s.date)),
        idx: link.order,
        sessionType: s.type,
      });
    }
  }
  // Merge y dedup
  const all = [...flatLegacy, ...flatFromJSON];
  const seen = new Set<string>();
  const dedup = [];
  for (const it of all) {
    const key = `${it.sessionId}::${it.id}::${it.idx ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(it);
  }
  // Filtros
  let flat = dedup;
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
