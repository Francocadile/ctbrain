"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CreateTeamForm from "./CreateTeamForm";
import TeamRow from "./TeamRow";
import type { FeedbackPayload, SuperadminTeam } from "./types";

type Props = {
  teams: SuperadminTeam[];
  error: string | null;
};

export default function TeamsClient({ teams, error }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [teams],
  );

  const handleFeedback = useCallback(
    (payload: FeedbackPayload) => {
      setFeedback(payload);
      if (payload.type === "success" || payload.refresh) {
        router.refresh();
      }
    },
    [router],
  );

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <main className="min-h-[70vh] px-6 py-10 space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipos · SUPERADMIN</h1>
          <p className="mt-1 text-gray-600">Gestioná equipos globales, sus slugs y estados de actividad.</p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          onClick={() => router.refresh()}
        >
          Actualizar lista
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error al cargar equipos: {error}
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Crear nuevo equipo</h2>
          <p className="text-sm text-gray-500">Define un nombre y slug únicos para habilitarlo automáticamente.</p>
        </div>
        <CreateTeamForm onFeedback={handleFeedback} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Equipos existentes</h2>
          <span className="text-sm text-gray-500">{sortedTeams.length} equipos</span>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No hay equipos registrados todavía.
                  </td>
                </tr>
              ) : (
                sortedTeams.map((team) => (
                  <TeamRow key={team.id} team={team} onFeedback={handleFeedback} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
