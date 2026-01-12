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
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;

function cellMarker(turn: "morning" | "afternoon", row: string) {
  return `[GRID:${turn}:${row}]`;
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

  const header = {
    name,
    place: lugar,
    time: hora,
    videoUrl: video.url || null,
    microLabel: null,
  };

  const viewBlocks: SessionDayBlock[] = CONTENT_ROWS.map((rowLabel) => {
    const marker = cellMarker(params.turn, rowLabel);
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
      rowKey: rowLabel,
      rowLabel,
      title: (cell?.title || "").trim(),
      sessionId: cell?.id || "",
      exercises,
    };
  });

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
