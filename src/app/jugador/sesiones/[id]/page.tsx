import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import SessionDetailView from "@/components/sessions/SessionDetailView";
import { decodeExercises } from "@/lib/sessions/encodeDecodeExercises";
import { getSessionById } from "@/lib/api/sessions";

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

  const sessionRes = await getSessionById(params.id);
  const session = sessionRes?.data as any;

  if (!sessionRes || !session) {
    notFound();
  }

  // Seguridad multi-equipo: que la sesión sea del mismo team que el jugador
  if ((session as any).teamId && (session as any).teamId !== player.teamId) {
    notFound();
  }

  let exercises: any[] = [];
  try {
    const decoded = decodeExercises(session.description as any);
    exercises = decoded.exercises as any;
  } catch (e) {
    // Si hay error de parseo, dejamos exercises = [] y no rompemos el server
    console.error("Failed to decode exercises for player session", e);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 md:px-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <SessionDetailView
          session={session as any}
          exercises={exercises}
          markerRow=""
          markerTurn=""
          markerYmd=""
          isViewMode={true}
          mode="player"
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
