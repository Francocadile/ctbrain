import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import SessionDetailView, {
  type SessionDetailExercise,
} from "@/components/sessions/SessionDetailView";
import { decodeExercises } from "@/app/ct/sessions/[id]/page";

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

  const { exercises } = decodeExercises(session.description as any) as {
    exercises: SessionDetailExercise[];
    prefix: string;
  };

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
