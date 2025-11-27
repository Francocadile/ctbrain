import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import ExercisesLibraryClient from "../ExercisesLibraryClient";

export const dynamic = "force-dynamic";

async function getSessionExercises() {
  const res = await fetch(`/api/ct/exercises?usage=SESSION`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("No se pudieron cargar los ejercicios de sesión");
  }

  const json = (await res.json()) as { data: any[] };
  return json.data.map((e: any) => ({
    id: e.id,
    name: e.name,
    zone: e.zone,
    videoUrl: e.videoUrl,
    isTeamExercise: e.teamId != null,
    usage: e.usage,
    createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date(e.createdAt).toISOString(),
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

  const exercises = await getSessionExercises();

  return (
    <RoleGate allow={["CT", "ADMIN", "SUPERADMIN"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">
                Biblioteca de ejercicios · Sesiones / Campo
              </h1>
              <p className="text-xs md:text-sm text-gray-600">
                Explora y filtra los ejercicios pensados para sesiones y trabajos en campo.
              </p>
            </div>
          </header>

          <ExercisesLibraryClient exercises={exercises} />
        </div>
      </main>
    </RoleGate>
  );
}
