import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import SessionDetailView from "@/components/sessions/SessionDetailView";
import { decodeExercises } from "@/lib/sessions/encodeDecodeExercises";

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
  try {
    const decoded = decodeExercises(plainSession.description as any);
    exercises = decoded.exercises as any;
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
