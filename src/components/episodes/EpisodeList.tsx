// src/components/episodes/EpisodeList.tsx
"use client";

import * as React from "react";
import { useEpisodes, todayYMD, type Episode } from "@/hooks/useEpisodes";
import StatusBadge from "./StatusBadge";
import RestrictionsChips from "./RestrictionsChips";

type Props = {
  /** YYYY-MM-DD; si no viene, arranca en hoy y se puede cambiar con el date picker */
  defaultDate?: string;
  /** Mostrar input de búsqueda local (por jugador, diagnóstico, zona) */
  withSearch?: boolean;
  /** Callback cuando se toca “Editar” */
  onEdit?: (ep: Episode) => void;
};

export default function EpisodeList({ defaultDate, withSearch = true, onEdit }: Props) {
  const { date, setDate, items, loading, error, reload } = useEpisodes(defaultDate || todayYMD());
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => {
      const bag = [
        it.userName,
        it.diagnosis,
        it.bodyPart,
        it.leaveKind,
        it.leaveStage,
        it.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return bag.includes(needle);
    });
  }, [items, q]);

  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border px-2 text-sm"
          />
          <button
            onClick={() => reload(date)}
            className="h-9 rounded-md border px-3 text-sm hover:bg-gray-50"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {withSearch && (
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por jugador, diagnóstico, zona…"
              className="h-9 w-64 rounded-md border px-3 text-sm"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="h-9 rounded-md border px-3 text-sm hover:bg-gray-50"
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Estados vacíos/errores */}
      {!loading && error === "EMPTY" && (
        <p className="text-sm text-gray-500">Sin episodios para esta fecha.</p>
      )}
      {!loading && error === "ERR" && (
        <p className="text-sm text-red-600">Error al cargar episodios.</p>
      )}

      {/* Tabla */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">Jugador</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Dx / Zona</th>
                <th className="px-3 py-2">ETR</th>
                <th className="px-3 py-2">Restricciones</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ep) => (
                <tr key={ep.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{ep.userName}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={ep.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[32ch] truncate">
                      {ep.leaveKind === "ENFERMEDAD"
                        ? ep.diagnosis || ep.illSymptoms || "—"
                        : ep.diagnosis || ep.bodyPart || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ep.leaveKind === "ENFERMEDAD" ? "Enfermedad" : ep.leaveKind === "LESION" ? "Lesión" : "—"}
                      {ep.bodyPart ? ` · ${ep.bodyPart}` : ""}
                      {ep.severity ? ` · ${ep.severity}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {ep.expectedReturn ? ep.expectedReturn : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <RestrictionsChips
                      capMinutes={ep.capMinutes ?? null}
                      noSprint={!!ep.noSprint}
                      noChangeOfDirection={!!ep.noChangeOfDirection}
                      gymOnly={!!ep.gymOnly}
                      noContact={!!ep.noContact}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onEdit?.(ep)}
                      className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer pequeño */}
      <div className="mt-3 text-xs text-gray-500">
        {loading
          ? "Cargando…"
          : `${filtered.length} episodio${filtered.length === 1 ? "" : "s"} encontrados`}
      </div>
    </section>
  );
}
