"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  FeedbackPayload,
  SuperadminTeam,
  TeamRoleValue,
  TeamUserAssignment,
  SuperadminUserSummary,
} from "../../types";
import { TEAM_ROLE_OPTIONS } from "../../types";

type Props = {
  team: SuperadminTeam;
  assignments: TeamUserAssignment[];
  users: SuperadminUserSummary[];
  initialError: string | null;
};

export default function TeamUsersClient({ team, assignments, users, initialError }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackPayload | null>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<TeamRoleValue>("CT");
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const availableUsers = useMemo(() => {
    const assigned = new Set(assignments.map((a) => a.userId));
    return users.filter((user) => !assigned.has(user.id));
  }, [assignments, users]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (initialError) {
      setFeedback({ type: "error", message: initialError });
    }
  }, [initialError]);

  const showFeedback = (payload: FeedbackPayload) => {
    setFeedback(payload);
    if (payload.type === "success") {
      router.refresh();
    }
  };

  const request = async (input: RequestInit) => {
    const res = await fetch("/api/superadmin/user-teams", {
      ...input,
      headers: {
        "Content-Type": "application/json",
        "x-team": team.id,
        ...(input.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error || `Error ${res.status}`;
      throw new Error(message);
    }
    return data;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showFeedback({ type: "error", message: "Seleccioná un usuario" });
      return;
    }
    setAdding(true);
    try {
      await request({
        method: "POST",
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      });
      setSelectedUserId("");
      showFeedback({ type: "success", message: "Usuario agregado al equipo" });
    } catch (err: any) {
      showFeedback({ type: "error", message: err?.message || "No se pudo agregar" });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (assignmentId: string, role: TeamRoleValue) => {
    setUpdatingId(assignmentId);
    try {
      await request({
        method: "PATCH",
        body: JSON.stringify({ id: assignmentId, role }),
      });
      showFeedback({ type: "success", message: "Rol actualizado" });
    } catch (err: any) {
      showFeedback({ type: "error", message: err?.message || "No se pudo actualizar" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!window.confirm("¿Quitar al usuario de este equipo?")) return;
    setRemovingId(assignmentId);
    try {
      await request({
        method: "DELETE",
        body: JSON.stringify({ id: assignmentId }),
      });
      showFeedback({ type: "success", message: "Usuario quitado del equipo" });
    } catch (err: any) {
      showFeedback({ type: "error", message: err?.message || "No se pudo quitar" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main className="min-h-[75vh] px-6 py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/superadmin/teams" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a equipos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios de {team.name}</h1>
          <p className="text-sm text-gray-600">Asigná, cambiá roles o quitá usuarios de este equipo.</p>
        </div>
      </div>

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
          <h2 className="text-xl font-semibold">Agregar usuario existente</h2>
          <p className="text-sm text-gray-500">Seleccioná un usuario aprobado y elegí el rol dentro del equipo.</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAdd}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Usuario</label>
            <select
              className="rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={!availableUsers.length}
            >
              <option value="">Seleccionar usuario</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} · {user.email}
                </option>
              ))}
            </select>
            {!availableUsers.length && (
              <p className="text-xs text-gray-500">Todos los usuarios disponibles ya pertenecen a este equipo.</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Rol dentro del equipo</label>
            <select
              className="rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as TeamRoleValue)}
            >
              {TEAM_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-full">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={adding || !availableUsers.length}
            >
              {adding ? "Agregando..." : "Agregar al equipo"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Miembros del equipo</h2>
            <p className="text-sm text-gray-500">
              {assignments.length > 0
                ? `${assignments.length} usuario${assignments.length === 1 ? "" : "s"} asignado${
                    assignments.length === 1 ? "" : "s"
                  }`
                : "Sin usuarios asignados"}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Rol global</th>
                <th className="px-6 py-3">Rol en el equipo</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Aún no hay usuarios asignados a este equipo.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {assignment.user?.name || assignment.user?.email || assignment.userId}
                      </p>
                      <p className="text-xs text-gray-500">{assignment.user?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{assignment.user?.role ?? "-"}</td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={assignment.role}
                        onChange={(e) =>
                          handleRoleChange(assignment.id, e.target.value as TeamRoleValue)
                        }
                        disabled={updatingId === assignment.id}
                      >
                        {TEAM_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                        onClick={() => handleRemove(assignment.id)}
                        disabled={removingId === assignment.id}
                      >
                        {removingId === assignment.id ? "Quitando..." : "Quitar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
