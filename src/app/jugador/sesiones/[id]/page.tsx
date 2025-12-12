import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import SessionDetailView from "@/components/sessions/SessionDetailView";
import { decodeExercises } from "@/lib/sessions/encodeDecodeExercises";
import type { RoutineSummary } from "@/lib/sessions/routineSummary";
import { getRoutineSummaryForTeam } from "@/lib/sessions/routineSummary";
import type { SessionRoutineSnapshot } from "@/lib/sessions/sessionRoutineSnapshot";
import { getSessionRoutineSnapshot } from "@/lib/sessions/sessionRoutineSnapshot";

export default async function JugadorSessionPage({ params }: { params: { id: string } }) {
  const sessionAuth = await getServerSession(authOptions);

  if (!sessionAuth?.user) {
    redirect("/login");
  }

  if (sessionAuth.user.role !== "JUGADOR") {
    redirect("/");
  }

  const player = await prisma.player.findFirst({
    where: { userId: sessionAuth.user.id },
    select: { id: true, teamId: true },
  });

  if (!player) {
    notFound();
  }

  // Leer la sesión directo desde Prisma, filtrando por teamId del jugador
  const session = await prisma.session.findFirst({
    where: {
      id: params.id,
      teamId: player.teamId,
    },
  });

  if (!session) {
    notFound();
  }

  // Normalizar a objeto plano serializable (dates → string, etc.)
  const plainSession = JSON.parse(JSON.stringify(session));

  // Decodificar ejercicios, ultra defensivo
  let exercises: any[] = [];
  let routineSummaries: Record<string, RoutineSummary> = {};
  let routineSnapshot: SessionRoutineSnapshot | null = null;
  try {
    const decoded = decodeExercises(plainSession.description as any);
    exercises = decoded.exercises as any;
    const routineIds = Array.from(
      new Set(
        (decoded.exercises || [])
          .map((ex: any) => (ex.routineId || "").trim())
          .filter((rid: string) => !!rid)
      )
    );

    if (routineIds.length > 0) {
      const entries: [string, RoutineSummary | null][] = await Promise.all(
        routineIds.map(async (rid) => [
          rid,
          await getRoutineSummaryForTeam(rid, player.teamId),
        ])
      );

      const map: Record<string, RoutineSummary> = {};
      for (const [rid, summary] of entries) {
        if (summary) map[rid] = summary;
      }
      routineSummaries = map;
    }

    // snapshot de rutina, si existe
    try {
      routineSnapshot = await getSessionRoutineSnapshot(plainSession.id as string);
    } catch (err) {
      console.error(
        "Failed to load routine snapshot for player session",
        err
      );
      routineSnapshot = null;
    }
  } catch (e) {
    console.error("Failed to decode exercises for player session", e);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 md:px-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <SessionDetailView
          session={plainSession as any}
          exercises={exercises}
          markerRow=""
          markerTurn=""
          markerYmd=""
          isViewMode={true}
          mode="player"
          routineSummaries={routineSummaries}
          routineSnapshot={routineSnapshot}
          editing={false}
          roCls="bg-gray-50 text-gray-600 cursor-not-allowed"
          pickerIndex={null}
          loadingPicker={false}
          pickerExercises={[]}
          visiblePickerExercises={[]}
          pickerSearch=""
        />
      </div>
    </main>
  );
}
