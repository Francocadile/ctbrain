// src/components/episodes/EpisodeList.tsx
"use client";

import * as React from "react";
import { useEpisodes, type Episode, todayYMD } from "@/hooks/useEpisodes";
import StatusBadge from "./StatusBadge";
import RestrictionsChips from "./RestrictionsChips";

type Props = {
  onNew?: (date?: string) => void;
  onEdit?: (ep: Episode) => void;
  initialDate?: string;
  className?: string;
};

const rank: Record<string, number> = {
  BAJA: 0,
  REINTEGRO: 1,
  LIMITADA: 2,
  ALTA: 3,
};

function parseYMD(s?: string | null) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export default function EpisodeList({
  onNew,
  onEdit,
  initialDate,
  className = "",
}: Props) {
  const { date, setDate, items, loading, error, reload } = useEpisodes(
    initialDate || todayYMD()
  );

  // ↪️ Sincronizar la fecha en la URL (?date=YYYY-MM-DD)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    window.history.replaceState({}, "", url.toString());
  }, [date]);

  const [query, setQuery] = React.useState("");

  const counts = React.useMemo(() => {
    const c = { BAJA: 0, REINTEGRO: 0, LIMITADA: 0, ALTA: 0 };
    for (const it of items) {
      if (it.status in c) (c as any)[it.status] += 1;
    }
    return c;
  }, [items]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter((it) => {
          const fields = [
            it.userName,
            it.diagnosis,
            it.bodyPart,
            it.notes,
            it.protocolObjectives,
            it.protocolTasks,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return fields.includes(q);
        })
      : items.slice();

    // Orden: estado (BAJA→ALTA), ETR asc (vacíos al final), nombre
    base.sort((a, b) => {
      const ra = rank[a.status] ?? 99;
      const rb = rank[b.status] ?? 99;
      if (ra !== rb) return ra - rb;

      const da = parseYMD(a.expectedReturn);
      const db = parseYMD(b.expectedReturn);
      if (da && db) {
        const diff = da.getTime() - db.getTime();
        if (diff !== 0) return diff;
      } else if (da && !db) {
        return -1; // con ETR primero
      } else if (!da && db) {
        return 1;
      }

      return (a.userName || "").localeCompare(b.userName || "");
    });

    return base;
  }, [items, query]);

  function exportCSV() {
    const headers = [
      "Fecha",
      "Jugador",
      "Estado",
      "Tipo",
      "Diagnóstico/Síntomas",
      "Zona",
      "Lateralidad",
      "Mecanismo",
      "Gravedad",
      "ETR",
      "Restricciones",
      "TopeMin",
      "Firma",
    ];

    const rows = filtered.map((r) => {
      const tipo = r.leaveKind || "";
      const diag =
        r.leaveKind === "LESION"
          ? r.diagnosis || ""
          : r.leaveKind === "ENFERMEDAD"
          ? r.illSymptoms || r.diagnosis || ""
          : "";
      const restr = [
        r.noSprint ? "Sin sprint" : "",
        r.noChangeOfDirection ? "Sin COD" : "",
        r.noContact ? "Sin contacto" : "",
        r.gymOnly ? "Gimnasio" : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return [
        r.date || "",
        r.userName || "",
        r.status || "",
        tipo,
        diag,
        r.bodyPart || "",
        r.laterality || "",
        r.mechanism || "",
        r.severity || "",
        r.expectedReturn || "",
        restr,
        r.capMinutes ?? "",
        r.medSignature || "",
      ];
    });

    const csv =
      [headers, ...rows]
        .map((r) =>
          r
            .map((c) => {
              const s = String(c ?? "");
              return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(";")
        )
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `episodios_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={`rounded-xl border bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <input
              type="date"
              className="mt-1 h-10 rounded-md border px-3 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Buscar</label>
            <input
              className="mt-1 h-10 rounded-md border px-3 text-sm"
              placeholder="Jugador, diagnóstico, zona…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="h-10 rounded-md border px-3 text-sm"
            onClick={() => reload(date)}
            disabled={loading}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="h-10 rounded-md border px-3 text-sm"
            onClick={exportCSV}
            disabled={loading || (filtered?.length ?? 0) === 0}
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="h-10 rounded-md bg-black px-4 text-sm text-white disabled:opacity-50"
            onClick={() => onNew?.(date)}
            disabled={loading}
          >
            Nuevo episodio
          </button>
        </div>
      </div>

      {/* Contadores por estado */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-red-50 text-red-700 ring-1 ring-red-200 px-2 py-1">
          BAJA: {counts.BAJA}
        </span>
        <span className="rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-1">
          REINTEGRO: {counts.REINTEGRO}
        </span>
        <span className="rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-1">
          LIMITADA: {counts.LIMITADA}
        </span>
        <span className="rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-1">
          ALTA: {counts.ALTA}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="px-3 py-2">Jugador</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Dx / Síntomas</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">ETR</th>
              <th className="px-3 py-2">Restricciones</th>
              <th className="px-3 py-2">Firma</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-3 text-sm text-slate-500" colSpan={8}>
                  Cargando…
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-sm text-slate-500" colSpan={8}>
                  {error === "EMPTY"
                    ? "No hay episodios para esta fecha."
                    : error === "ERR"
                    ? "No se pudo cargar."
                    : "Sin resultados."}
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((ep) => {
                const diag =
                  ep.leaveKind === "LESION"
                    ? ep.diagnosis || "—"
                    : ep.leaveKind === "ENFERMEDAD"
                    ? ep.illSymptoms || ep.diagnosis || "—"
                    : "—";

                return (
                  <tr key={ep.id} className="bg-white">
                    <td className="px-3 py-2 align-top">
                      <div className="text-sm font-medium">{ep.userName}</div>
                      <div className="text-xs text-slate-500">{ep.date}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge status={ep.status} />
                      {ep.leaveStage && (
                        <div className="mt-1 text-[11px] text-slate-500">
                          {ep.leaveStage.toLowerCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-sm">{diag}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-sm">{ep.bodyPart || "—"}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-sm">{ep.expectedReturn || "—"}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <RestrictionsChips
                        noSprint={ep.noSprint}
                        noChangeOfDirection={ep.noChangeOfDirection}
                        noContact={ep.noContact}
                        gymOnly={ep.gymOnly}
                        capMinutes={ep.capMinutes ?? null}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-sm">
                      {ep.medSignature || "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={() => onEdit?.(ep)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
