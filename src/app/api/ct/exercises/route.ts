// src/app/api/ct/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ====== Encoder/Decoder (idéntico al editor) =================================
const EX_TAG = "[EXERCISES]";

type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
};

function decodeExercises(desc: string | null | undefined): { prefix: string; exercises: Exercise[] } {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return { prefix: text, exercises: [] };
  const prefix = text.slice(0, idx).trimEnd();
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";
  try {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const arr = JSON.parse(json) as Partial<Exercise>[];
    if (Array.isArray(arr)) {
      const fixed = arr.map((e) => ({
        title: e.title ?? "",
        kind: e.kind ?? "",
        space: e.space ?? "",
        players: e.players ?? "",
        duration: e.duration ?? "",
        description: e.description ?? "",
        imageUrl: e.imageUrl ?? "",
      }));
      return { prefix, exercises: fixed };
    }
  } catch {}
  return { prefix: text, exercises: [] };
}

function encodeExercises(prefix: string, exercises: Exercise[]) {
  const b64 = Buffer.from(JSON.stringify(exercises), "utf-8").toString("base64");
  const safePrefix = (prefix || "").trimEnd();
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}

// ====== Tipos DTO =============================================================
type ExerciseDTO = {
  id: string;              // sessionId::index
  sessionId: string;       // para abrir en el editor de sesión
  title: string;
  createdAt: string;       // ISO (de la sesión)
  kind?: { name: string } | null;
  space?: string | null;
  players?: string | null;
  duration?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type SearchQuery = {
  q?: string;
  kindName?: string;
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: string;
  pageSize?: string;
};

function matchesQuery(ex: Exercise, q: string): boolean {
  const hay = `${ex.title} ${ex.description} ${ex.space} ${ex.players}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

// ====== GET /api/ct/exercises  (search) ======================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q: SearchQuery = {
      q: searchParams.get("q") || undefined,
      kindName: searchParams.get("kindName") || undefined,
      order: (searchParams.get("order") as any) || "createdAt",
      dir: (searchParams.get("dir") as any) || "desc",
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    };

    const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || "20", 10) || 20));

    // Traemos un conjunto razonable de sesiones recientes que podrían contener ejercicios
    // (sin filtrar por user para el MVP, eliminamos authOptions)
    const sessions = await prisma.session.findMany({
      where: {
        description: { contains: EX_TAG },
      },
      orderBy: { createdAt: "desc" },
      take: 1000, // tope defensivo
    });

    // Aplanamos todos los ejercicios de todas las sesiones
    let all: ExerciseDTO[] = [];
    for (const s of sessions) {
      const { exercises } = decodeExercises(s.description || "");
      exercises.forEach((ex, idx) => {
        all.push({
          id: `${s.id}::${idx}`,
          sessionId: s.id,
          title: ex.title || "(Sin título)",
          createdAt: s.createdAt.toISOString(),
          kind: ex.kind ? { name: ex.kind } : null,
          space: ex.space || null,
          players: ex.players || null,
          duration: ex.duration || null,
          description: ex.description || null,
          imageUrl: ex.imageUrl || null,
        });
      });
    }

    // Filtros
    if (q.kindName) {
      all = all.filter((r) => (r.kind?.name || "").toLowerCase() === q.kindName!.toLowerCase());
    }
    if (q.q) {
      all = all.filter((r) =>
        matchesQuery(
          {
            title: r.title,
            kind: r.kind?.name || "",
            space: r.space || "",
            players: r.players || "",
            duration: r.duration || "",
            description: r.description || "",
            imageUrl: r.imageUrl || "",
          },
          q.q!
        )
      );
    }

    // Orden
    const dir = (q.dir === "asc" ? 1 : -1) as 1 | -1;
    all.sort((a, b) => {
      if (q.order === "title") {
        return a.title.localeCompare(b.title) * dir;
      }
      // createdAt por defecto
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });

    // Paginado
    const total = all.length;
    const start = (page - 1) * pageSize;
    const data = all.slice(start, start + pageSize);

    return NextResponse.json({
      data,
      meta: { total, page, pageSize },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// ====== POST /api/ct/exercises (opcional – no lo usamos aún) =================
// Para un MVP puro, omitimos crear ejercicios sueltos (vivimos dentro de Session).
export async function POST() {
  return new NextResponse("No implementado en MVP (alojar dentro de Session)", { status: 501 });
}
