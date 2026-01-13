import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import SessionDayView, { SessionDayBlock } from "@/components/sessions/SessionDayView";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decodeExercises, type Exercise } from "@/lib/sessions/encodeDecodeExercises";

function getDayRangeFromYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month - 1, day + 1));
  return { start, end };
}

const META_ROWS = ["LUGAR", "HORA", "VIDEO", "NOMBRE SESIÓN"] as const;
// Meta-rows del editor (NO deben aparecer como bloques de contenido en by-day)
const META_ROW_IDS = [
  "NOMBRE SESIÓN",
  "TIPO SESIÓN",
  "LUGAR",
  "HORA",
  "ESPACIO SUGERIDO",
  "VIDEO",
  "RIVAL",
] as const;
// Fallback por compatibilidad para semanas viejas (si no hay prefs)
const DEFAULT_CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;

type TurnKey = "morning" | "afternoon";

/* ====== Marcadores usados por el editor ====== */
const DAYFLAG_TAG = "DAYFLAG";
const MICRO_TAG = "MICRO";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;

type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rivalId?: string; rival?: string; logoUrl?: string };

// Compat: NUEVO (PARTIDO|id|name|logo) y VIEJO (PARTIDO|name|logo)
function parseDayFlagTitle(title?: string | null): DayFlag {
  const raw = (title || "").trim();
  if (!raw) return { kind: "NONE" };
  const parts = raw.split("|").map((x) => (x || "").trim());
  const kind = parts[0];
  if (kind === "PARTIDO") {
    if (parts.length >= 4) {
      const [, id, name, logo] = parts;
      return { kind: "PARTIDO", rivalId: id || undefined, rival: name || "", logoUrl: logo || "" };
    }
    if (parts.length >= 3) {
      const [, name, logo] = parts;
      return { kind: "PARTIDO", rival: name || "", logoUrl: logo || "" };
    }
    return { kind: "PARTIDO" };
  }
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  const allowed = new Set(["", "MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "DESCANSO"]);
  return (allowed.has(t) ? (t as MicroKey) : "") as MicroKey;
}

function isDayFlag(s: any, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
function isMicro(s: any, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(microMarker(turn));
}

function cellMarker(turn: "morning" | "afternoon", row: string) {
  return `[GRID:${turn}:${row}]`;
}

function extractGridRowId(description: unknown, turn: TurnKey): string | null {
  if (typeof description !== "string") return null;
  const prefix = `[GRID:${turn}:`;
  if (!description.startsWith(prefix)) return null;
  const end = description.indexOf("]", prefix.length);
  if (end === -1) return null;
  const rowId = description.slice(prefix.length, end);
  return rowId.trim() || null;
}

export default async function JugadorSessionDayPage({
  params,
}: {
  params: { ymd: string; turn: "morning" | "afternoon" };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "JUGADOR") {
    redirect("/");
  }

  const player = await (prisma as any).player.findFirst({
    where: { userId: session.user.id },
  });

  if (!player) {
    redirect("/jugador");
  }

  const { start, end } = getDayRangeFromYmd(params.ymd);

  const daySessions = await (prisma as any).session.findMany({
    where: {
      teamId: player.teamId,
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { date: "asc" },
  });

  // Prefs del planner (labels + filas dinámicas de contenido)
  let rowLabels: Record<string, string> = {};
  let contentRowIds: string[] = [...DEFAULT_CONTENT_ROWS];
  try {
    const prefs = await (prisma as any).plannerPrefs.findFirst({
      where: { teamId: player.teamId },
      orderBy: { createdAt: "desc" },
    });
    rowLabels = (prefs?.rowLabels || {}) as Record<string, string>;
    if (Array.isArray(prefs?.contentRowIds) && prefs.contentRowIds.length) {
      contentRowIds = prefs.contentRowIds as string[];
    }
  } catch {
    // fallback silencioso
    rowLabels = {};
    contentRowIds = [...DEFAULT_CONTENT_ROWS];
  }

  // Merge: filas preferidas (prefs) + filas detectadas en sesiones (GRID) para este turno.
  // Esto cubre el caso donde existe una fila nueva (ej "TAREA 5") ya persistida en sessions
  // pero todavía no figura en prefs (o el jugador está leyendo prefs viejas).
  const finalRowIds: string[] = (() => {
    const seen = new Set<string>();
    const out: string[] = [];

    // 1) primero las de prefs (preserva orden)
    for (const id of contentRowIds) {
      const key = String(id || "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }

    // 2) luego las que aparecen en sessions como GRID markers
    const extras: string[] = [];
    for (const s of daySessions as any[]) {
      const rowId = extractGridRowId(s?.description, params.turn);
      if (!rowId) continue;
      if (seen.has(rowId)) continue;
      // evitamos capturar meta rows como “bloques"
      if ((META_ROW_IDS as readonly string[]).includes(rowId)) continue;
      seen.add(rowId);
      extras.push(rowId);
    }

    // Orden: por aparición ya está OK según orderBy: { date: "asc" },
    // que es estable para las celdas del día.
    out.push(...extras);
    return out;
  })();

  // Label visible:
  // - si existe rowLabels[rowId], usarlo
  // - si no existe y rowId empieza con ROW-, mostrar "TAREA N" (N basado en posición 1-based)
  // - sino, fallback al rowId
  const labelForRowId = (rowId: string, contentIndex1Based: number) => {
    const fromPrefs = rowLabels[rowId];
    if (fromPrefs) return fromPrefs;
    if (rowId.startsWith("ROW-")) return `TAREA ${contentIndex1Based}`;
    return rowId;
  };

  const getMetaCell = (row: (typeof META_ROWS)[number]) => {
    const marker = cellMarker(params.turn, row);
    const s = daySessions.find(
      (it: any) => typeof it.description === "string" && it.description.startsWith(marker)
    );
    return (s?.title || "").trim();
  };

  const lugar = getMetaCell("LUGAR");
  const hora = getMetaCell("HORA");
  const videoRaw = getMetaCell("VIDEO");
  const name = getMetaCell("NOMBRE SESIÓN");

  function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
    const raw = (v || "").trim();
    if (!raw) return { label: "", url: "" };
    const [label, url] = raw.split("|").map((s) => s.trim());
    if (!url && label?.startsWith("http")) return { label: "Video", url: label };
    return { label: label || "", url: url || "" };
  }

  const video = parseVideoValue(videoRaw);

  // Día libre / partido / etc.
  const dayFlag: DayFlag = (() => {
    const f = daySessions.find((s: any) => isDayFlag(s, params.turn));
    return parseDayFlagTitle(f?.title);
  })();

  // Intensidad (MICRO)
  const micro: MicroKey = (() => {
    const m = daySessions.find((s: any) => isMicro(s, params.turn));
    return parseMicroTitle(m?.title);
  })();

  const header = {
    name,
    place: lugar,
    time: hora,
    videoUrl: video.url || null,
    microLabel: micro || null,
  };

  // Bloques: igual que CT by-day: usa contentRowIds (dinámico) + rowLabels
  const viewBlocks: SessionDayBlock[] = finalRowIds.map((rowId, idx) => {
    const contentIndex = idx + 1;
    const marker = cellMarker(params.turn, rowId);
    const cell = daySessions.find(
      (it: any) => typeof it.description === "string" && it.description.startsWith(marker)
    );

    let exercises: Exercise[] = [];
    if (cell?.description) {
      try {
        const decoded = decodeExercises(cell.description);
        exercises = decoded.exercises || [];
      } catch (e) {
        // no rompemos vista jugador si hay una celda vieja o malformada
        console.error("[player by-day] decodeExercises failed", e);
      }
    }

    return {
      rowKey: rowId,
      rowLabel: labelForRowId(rowId, contentIndex),
      title: (cell?.title || "").trim(),
      sessionId: cell?.id || "",
      exercises,
    };
  });

  // Si es día libre, mostramos solo el mensaje (igual que CT)
  if (dayFlag.kind === "LIBRE") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div>
            <Link
              href="/jugador"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              <span className="mr-1">←</span>
              <span>Volver</span>
            </Link>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-6 text-center text-gray-700 font-semibold">
            DESCANSO
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 md:px-6 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <Link
            href="/jugador"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            <span className="mr-1">←</span>
            <span>Volver</span>
          </Link>
        </div>
        <SessionDayView
          date={params.ymd}
          turn={params.turn}
          header={header}
          blocks={viewBlocks}
          mode="player"
        />
      </div>
    </main>
  );
}
