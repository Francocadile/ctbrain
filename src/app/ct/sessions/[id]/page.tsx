"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
type User = { id: string; name: string | null; email: string | null; role: Role };

type Session = {
  id: string;
  title: string;
  description?: string | null;
  date: string;        // ISO
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  createdBy: { id: string; name: string | null; email: string | null };
  players: User[];
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchOne = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar la sesión");
      setData(json.data as Session);
    } catch (e: any) {
      setErr(e.message || "Error cargando sesión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOne();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta sesión?")) return;
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json?.error || "No se pudo eliminar");
      return;
    }
    router.push("/ct/sessions");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-sm text-gray-500">Cargando sesión…</div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err || "Sesión no encontrada"}
        </div>
        <button
          onClick={() => router.push("/ct/sessions")}
          className="px-3 py-1 text-sm rounded-lg border hover:bg-gray-50"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            📅 {new Date(data.date).toLocaleString()} ·
            {" "}
            👤 {data.createdBy?.name || data.createdBy?.email || "CT"} ·
            {" "}
            📌 ID: <span className="font-mono">{data.id}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/ct/sessions")}
            className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            Volver
          </button>
          <button
            onClick={() => router.push("/ct/sessions")}
            className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {data.description && (
        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-2">Descripción</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p>
        </section>
      )}

      <section className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-2">Jugadores asignados</h2>
        {data.players?.length ? (
          <div className="flex flex-wrap gap-2">
            {data.players.map((p) => (
              <span
                key={p.id}
                className="text-xs rounded-full border px-2 py-0.5"
                title={p.email || undefined}
              >
                {p.name || p.email || p.id}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Sin jugadores asignados.</div>
        )}
      </section>

      {/* Bloques futuros: objetivos, tareas, adjuntos, vídeos, RPE/Wellness */}
      <section className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-2">Bloques de trabajo</h2>
        <div className="text-sm text-gray-500">
          Próximamente: objetivos, tareas, adjuntos, clips de video y formularios.
        </div>
      </section>
    </div>
  );
}
