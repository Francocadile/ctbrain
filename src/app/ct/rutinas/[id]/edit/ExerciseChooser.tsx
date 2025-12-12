"use client";

import { useEffect, useState } from "react";

type ExerciseDTO = {
  id: string;
  name: string;
  zone: string | null;
};

export default function ExerciseChooser({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (exerciseId: string, exerciseName: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/ct/exercises?usage=ROUTINE", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : json;
        if (!cancelled) {
          setExercises(Array.isArray(list) ? list : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = exercises.filter((ex) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      ex.name.toLowerCase().includes(term) ||
      (ex.zone || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Elegir ejercicio de rutina</h2>
          <button
            type="button"
            className="text-xs text-gray-500 hover:underline"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        {!loading && exercises.length > 0 && (
          <div className="mb-2">
            <input
              type="text"
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="Buscar por nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <p className="text-xs text-gray-500">Cargando ejercicios...</p>
        ) : exercises.length === 0 ? (
          <p className="text-xs text-gray-500">
            No hay ejercicios en la biblioteca de Rutinas.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-gray-500">
            No hay ejercicios que coincidan con la búsqueda.
          </p>
        ) : (
          <ul className="max-h-64 overflow-auto divide-y divide-gray-100">
            {visible.map((ex) => (
              <li key={ex.id} className="py-1.5 text-xs">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onChoose(ex.id, ex.name)}
                >
                  <p className="font-medium text-gray-900">{ex.name}</p>
                  {ex.zone && (
                    <p className="text-[11px] text-gray-500">Zona: {ex.zone}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
