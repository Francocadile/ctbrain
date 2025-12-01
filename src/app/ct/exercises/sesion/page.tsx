import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import ExercisesLibraryClient from "../ExercisesLibraryClient";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

async function getSessionExercises(userId: string) {
  const { prisma, team } = await dbScope();

  // Ejercicios para sesiones / campo: globales + del equipo
  const exercises = await prisma.exercise.findMany({
    where: {
      usage: "SESSION",
      OR: [{ teamId: null }, { teamId: team.id }],
    },
    orderBy: { name: "asc" },
  });

  return exercises.map((e) => ({
    id: e.id,
    name: e.name,
    zone: e.zone,
    videoUrl: e.videoUrl,
    isTeamExercise: e.teamId != null,
    createdAt: e.createdAt.toISOString(),
    originSessionId: (e as any).originSessionId ?? null,
    sessionMeta: (e as any).sessionMeta ?? null,
  }));
}

export default async function CTSessionExercisesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (
    session.user.role !== "CT" &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUPERADMIN"
  ) {
    redirect("/");
  }

  const exercises = await getSessionExercises(session.user.id);

  return (
    <RoleGate allow={["CT", "ADMIN", "SUPERADMIN"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">
                Biblioteca de Ejercicios – Sesiones / Campo
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Ejercicios para sesiones y trabajos en campo.
              </p>
            </div>
          </header>

            <ExercisesLibraryClient exercises={exercises} mode="SESSION" />
        </div>
      </main>
    </RoleGate>
  );
}
