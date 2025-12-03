import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import SessionPageContent, {
  Exercise as CtExercise,
} from "@/app/ct/sessions/[id]/SessionPageContent";
import type { LinkedRoutineDTO } from "@/app/ct/sessions/[id]/SessionRoutinePanel";

export default async function JugadorSessionPage({ params }: { params: { id: string } }) {
  const sessionAuth = await getServerSession(authOptions);
  if (!sessionAuth?.user || sessionAuth.user.role !== "JUGADOR") {
    redirect("/login");
  }

  const player = await prisma.player.findFirst({
    where: { userId: sessionAuth.user.id },
    include: { team: true },
  });

  if (!player) notFound();

  const session = await prisma.session.findFirst({
    where: { id: params.id, teamId: player.teamId },
  });

  if (!session) notFound();

  let exercises: CtExercise[] = [];
  try {
    const text = (session.description || "").trim();
    // reuse the same EX_TAG marker logic as CT: [EXERCISES] <b64>
    const EX_TAG = "[EXERCISES]";
    const idx = text.lastIndexOf(EX_TAG);
    if (idx !== -1) {
      const rest = text.slice(idx + EX_TAG.length).trim();
      const b64 = rest.split(/\s+/)[0] || "";
      const raw = Buffer.from(b64, "base64").toString("utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        exercises = arr.map((e: any) => ({
          title: e.title ?? "",
          kind: e.kind ?? "",
          space: e.space ?? "",
          players: e.players ?? "",
          duration: e.duration ?? "",
          description: e.description ?? "",
          imageUrl: e.imageUrl ?? "",
          routineId: e.routineId ?? "",
          routineName: e.routineName ?? "",
        }));
      }
    }
    // En el modelo actual no hay relación directa session.exercises; si no hay ejercicios
    // decodificados, simplemente dejamos la lista vacía.
  } catch {
    exercises = [];
  }

  // Rutinas de fuerza vinculadas a la sesión (solo lectura para el jugador)
  const sessionRoutines = await prisma.sessionRoutine.findMany({
    where: { sessionId: session.id },
    include: { routine: true },
  });

  const linkedRoutines: LinkedRoutineDTO[] = sessionRoutines.map((link) => ({
    id: String(link.routine.id),
    title: link.routine.title || "Rutina sin nombre",
  }));

  return (
    <RoleGate allow={["JUGADOR"]}>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <SessionPageContent
            session={session as any}
            exercises={exercises}
            linkedRoutines={linkedRoutines}
            isViewMode={true}
          />
        </div>
      </main>
    </RoleGate>
  );
}
