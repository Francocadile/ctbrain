import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import SessionDetailView, {
  type SessionDetailExercise,
} from "@/components/sessions/SessionDetailView";
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

  const session = await prisma.session.findFirst({
    where: {
      id: params.id,
      teamId: player.teamId,
    },
  });

  if (!session) {
    notFound();
  }

  let exercises: SessionDetailExercise[] = [];
  try {
    const decoded = decodeExercises(session.description as any);
    exercises = decoded.exercises as any;
  } catch (e) {
    // Si hay error de parseo, dejamos exercises = [] y no rompemos el server
    console.error("Failed to decode exercises for player session", e);
  }

  const safeSession = JSON.parse(JSON.stringify(session));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 md:px-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <SessionDetailView
          session={safeSession as any}
          exercises={exercises}
          markerRow={""}
          markerTurn={""}
          markerYmd={""}
          isViewMode={true}
          mode="player"
          editing={false}
          roCls="bg-gray-50 text-gray-600 cursor-not-allowed"
          updateExercise={() => {}}
          addExercise={() => {}}
          removeExercise={() => {}}
          isVideoUrl={() => false}
          openLibraryPicker={() => {}}
          pickerIndex={null}
          loadingPicker={false}
          pickerExercises={[]}
          visiblePickerExercises={[]}
          pickerSearch=""
          setPickerSearch={() => {}}
          setPickerIndex={() => {}}
        />
      </div>
    </main>
  );
}
