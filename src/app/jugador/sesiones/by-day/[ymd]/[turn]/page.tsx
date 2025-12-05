import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import { type SessionDTO } from "@/lib/api/sessions";
import { Buffer } from "buffer";

type TurnKey = "morning" | "afternoon";

// Bloques principales de contenido (copiados de CT)
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;

// Metadatos (arriba). Agregamos NOMBRE SESIÓN (copiados de CT)
const META_ROWS = ["LUGAR", "HORA", "VIDEO", "NOMBRE SESIÓN"] as const;

/* ====== Marcadores usados por el editor (copiados de CT) ====== */
const DAYFLAG_TAG = "DAYFLAG"; // título: "PARTIDO|rival|logo" | "LIBRE" | ""
const MICRO_TAG = "MICRO"; // título: "MD+1" | "MD+2" | ... | "MD" | "DESCANSO" | ""
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;

/* ====== Helpers generales (copiados de CT) ====== */
function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}
function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}

function humanDateShort(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

/* ====== Partido / Descanso (copiados de CT) ====== */
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };

function isDayFlag(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

/* ====== Intensidad (Microciclo) (copiados de CT) ====== */
type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
function isMicro(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(microMarker(turn));
}
function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  const allowed = new Set(["", "MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "DESCANSO"]);
  return (allowed.has(t) ? (t as MicroKey) : "") as MicroKey;
}
function microChipClass(v: MicroKey) {
  // Colores en línea con editor/dashboard
  switch (v) {
    case "MD+1":
      return "bg-blue-100 text-blue-900 border-blue-200";
    case "MD+2":
      return "bg-yellow-100 text-yellow-900 border-yellow-200";
    case "MD-4":
      return "bg-red-100 text-red-900 border-red-200";
    case "MD-3":
      return "bg-orange-100 text-orange-900 border-orange-200";
    case "MD-2":
      return "bg-green-100 text-green-900 border-green-200";
    case "MD-1":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "MD":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "DESCANSO":
      return "bg-gray-200 text-gray-800 border-gray-300";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

// ==== Decodificar ejercicios de una sesión (copiado de JugadorSessionPage) ====
type SessionExercise = {
  title: string;
  kind?: string;
  space?: string;
  players?: string;
  duration?: string;
  description?: string;
  imageUrl?: string;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
};

function decodeSessionExercisesFromDescription(
  desc: string | null | undefined
): SessionExercise[] {
  try {
    const text = (desc || "").trim();
    const EX_TAG = "[EXERCISES]";
    const idx = text.lastIndexOf(EX_TAG);
    if (idx === -1) return [];
    const rest = text.slice(idx + EX_TAG.length).trim();
    const b64 = rest.split(/\s+/)[0] || "";
    const raw = Buffer.from(b64, "base64").toString("utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((e: any) => ({
      title: e.title ?? "",
      kind: e.kind ?? "",
      space: e.space ?? "",
      players: e.players ?? "",
      duration: e.duration ?? "",
      description: e.description ?? "",
      imageUrl: e.imageUrl ?? "",
      routineId: e.routineId ?? "",
      routineName: e.routineName ?? "",
      isRoutineOnly: e.isRoutineOnly ?? false,
    }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: { ymd: string; turn: TurnKey };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function JugadorSessionTurnoPage({ params, searchParams }: PageProps) {
  const { ymd, turn } = params;
  const focus = (searchParams?.focus as string) || "";

  const sessionAuth = await getServerSession(authOptions);
  if (!sessionAuth?.user || sessionAuth.user.role !== "JUGADOR") {
    redirect("/login");
  }

  const player = await prisma.player.findFirst({
    where: { userId: sessionAuth.user.id },
    include: { team: true },
  });

  if (!player) notFound();

  const date = new Date(`${ymd}T00:00:00.000Z`);
  const startOfDay = new Date(date.getTime());
  const endOfDay = new Date(date.getTime());
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const rawSessions = await prisma.session.findMany({
    where: {
      teamId: player.teamId,
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    orderBy: { date: "asc" },
  });

  const daySessions = rawSessions as unknown as SessionDTO[];

  const meta = (() => {
    const get = (row: (typeof META_ROWS)[number]) =>
      (daySessions.find((s) => isCellOf(s, turn, row))?.title || "").trim();
    const lugar = get("LUGAR");
    const hora = get("HORA");
    const videoRaw = get("VIDEO");
    const name = get("NOMBRE SESIÓN");
    const video = parseVideoValue(videoRaw);
    return { lugar, hora, video, name };
  })();

  const dayFlag: DayFlag = (() => {
    const f = daySessions.find((s) => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  })();

  const micro: MicroKey = (() => {
    const m = daySessions.find((s) => isMicro(s, turn));
    return parseMicroTitle(m?.title);
  })();

  const blocks = CONTENT_ROWS.map((row) => {
    const s = daySessions.find((it) => isCellOf(it, turn, row));
    const text = (s?.title || "").trim();

    let firstRoutineId: string | null = null;
    let hasRoutineOnly = false;

    if (s) {
      const exs = decodeSessionExercisesFromDescription(s.description as any);
      const routineEx = exs.find((e) => {
        const hasRoutine = !!e.routineId;
        const hasExerciseFields =
          !!e.title?.trim() ||
          !!e.kind?.trim() ||
          !!e.description?.trim() ||
          !!e.space?.trim() ||
          !!e.players?.trim() ||
          !!e.duration?.trim() ||
          !!e.imageUrl?.trim();

        if (!hasRoutine) return false;

        // rutina pura = marcada como rutinaOnly o sin campos de ejercicio
        if (e.isRoutineOnly) return true;
        if (!hasExerciseFields) return true;

        return false;
      });
      if (routineEx && routineEx.routineId) {
        firstRoutineId = routineEx.routineId;
        hasRoutineOnly = true;
      }
    }

    return { row, text, id: s?.id || "", firstRoutineId, hasRoutineOnly };
  });

  return (
    <RoleGate allow={["JUGADOR"]}>
      <div className="p-4 space-y-4 print-root">
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm text-gray-500">
              {humanDateShort(ymd)}, {turn === "morning" ? "Mañana" : "Tarde"}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${microChipClass(micro)}`}>
              {micro || "—"}
            </span>
            {meta.name ? (
              <span className="text-sm text-gray-700">
                · <b>{meta.name}</b>
              </span>
            ) : null}
          </div>
        </header>

        {/* Meta */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-emerald-50 text-emerald-900 font-semibold px-3 py-2 border-b uppercase tracking-wide text-[12px]">
            Detalles
          </div>
          <div className="grid md:grid-cols-4 gap-2 p-3 text-sm">
            <div>
              <div className="text-[11px] text-gray-500">Nombre de sesión</div>
              <div className="font-medium">
                {meta.name || <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">Lugar</div>
              <div className="font-medium">
                {meta.lugar || <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">Hora</div>
              <div className="font-medium">
                {meta.hora || <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">Video</div>
              {meta.video.url ? (
                <a
                  href={meta.video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-emerald-700"
                  title={meta.video.label || "Video"}
                >
                  {meta.video.label || "Video"}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>

            {dayFlag.kind === "PARTIDO" && (
              <>
                <div className="md:col-span-2">
                  <div className="text-[11px] text-gray-500">Rival</div>
                  <div className="font-medium">
                    {dayFlag.rival || <span className="text-gray-400">—</span>}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-[11px] text-gray-500">Logo</div>
                  {dayFlag.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dayFlag.logoUrl}
                      alt="Logo rival"
                      className="h-10 w-auto object-contain rounded border bg-white"
                    />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {dayFlag.kind === "LIBRE" ? (
          <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-700 font-semibold">
            DESCANSO
          </div>
        ) : (
          <section className="space-y-3">
            {blocks.map(({ row, text, id, firstRoutineId, hasRoutineOnly }) => (
              <div
                key={row}
                className="rounded-2xl border bg-white shadow-sm p-3"
                id={row === focus ? "focus" : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                    {row}
                  </h2>
                  {id && (
                    <div className="flex gap-2 no-print">
                      {hasRoutineOnly && firstRoutineId ? (
                        <a
                          href={`/jugador/rutinas/${firstRoutineId}`}
                          className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
                        >
                          Ver rutina
                        </a>
                      ) : (
                        <a
                          href={`/jugador/sesiones/${id}`}
                          className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
                        >
                          Ver ejercicio
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="min-h-[120px] whitespace-pre-wrap leading-6 text-[13px]">
                  {text || <span className="text-gray-400 italic">—</span>}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </RoleGate>
  );
}
