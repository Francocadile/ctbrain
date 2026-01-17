import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";
import { getSessionById, type SessionDTO } from "@/lib/api/sessions";
import { decodeExercises, type Exercise } from "@/lib/sessions/encodeDecodeExercises";
import SessionDetailView from "@/components/sessions/SessionDetailView";

export default async function MedicoSessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Requisito: consumir GET /api/sessions/[id] (read-only)
  const res = await getSessionById(id);
  const sess: SessionDTO = (res as any)?.data ? (res as any).data : (res as any);

  // Parseo legacy: ejercicios embebidos en description
  let prefix = "";
  let exercises: Exercise[] = [];
  try {
    const decoded = decodeExercises(sess?.description || "");
    prefix = decoded.prefix || "";
    exercises = decoded.exercises || [];
  } catch {
    prefix = "";
    exercises = [];
  }

  // Read-only: forzamos isViewMode + mode="player" (SessionDetailView no muestra UI CT).
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10 space-y-4">
        <BackToMedico />
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <SessionDetailView
            session={{ ...sess, description: prefix }}
            exercises={exercises}
            isViewMode
            mode="player"
            roCls=""
          />
        </div>
      </main>
    </RoleGate>
  );
}
