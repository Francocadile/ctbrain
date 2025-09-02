// src/app/ct/sessions/by-day/[date]/[turn]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type TurnKey = "morning" | "afternoon";

type Session = {
  id: string;
  title: string;
  description?: string | null;
  date: string; // ISO
  type?: string | null;
};

function ymdUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function isCellForTurn(desc: string | undefined | null, turn: TurnKey) {
  if (!desc) return false;
  return (
    desc.startsWith(`[GRID:${turn}:`) ||
    desc.startsWith(`[DAYFLAG:${turn}]`)
  );
}

export default function SessionsByDayTurnPage() {
  const { date, turn } = useParams<{ date: string; turn: TurnKey }>();
  const qs = useSearchParams();
  const focusRow = qs.get("focus") || "";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Traemos TODAS las sesiones de ese día y filtramos por turno en el cliente
        const res = await fetch(`/api/sessions?date=${encodeURIComponent(date)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");

        const arr = (json?.data || []) as Session[];
        // Mantener solo las del día (por si la API devuelve de más) y el turno
        const filtered = arr.filter(s => {
          const d = new Date(s.date);
          const y = ymdUTC(d);
          return y === date && isCellForTurn(s.description || "", turn);
        });

        setItems(filtered);
      } catch (e: any) {
        setError(e?.message || "Error cargando");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date, turn]);

  const grouped = useMemo(() => {
    // Agrupar por “row/bloque” si está en el marcador [GRID:turn:ROW]
    const map = new Map<string, Session[]>();
    for (const s of items) {
      const m = (s.description || "").match(/^\[GRID:(morning|afternoon):(.+?)\]/i);
      const row = m?.[2]?.trim() || "GENERAL";
      if (!map.has(row)) map.set(row, []);
      map.get(row)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <div className="p-3 md:p-4 space-y-4">
      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Sesión — {turn === "morning" ? "Mañana" : "Tarde"} · {date}
          </h1>
          {focusRow ? (
            <p className="text-xs text-gray-500">Foco: <span className="font-medium">{focusRow}</span></p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <a href="/ct/plan-semanal" className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50">✏️ Editor semanal</a>
          <a href="/ct/sessions" className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50">← Sesiones y ejercicios</a>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay entradas para {date} — {turn === "morning" ? "Mañana" : "Tarde"}.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([row, list]) => (
            <section key={row} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                {row}
              </div>
              <ul className="divide-y">
                {list.map(s => (
                  <li key={s.id} className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{s.title || "Sin título"}</div>
                        {s.description ? (
                          <div className="text-[12px] text-gray-600 mt-1 whitespace-pre-wrap">
                            {s.description}
                          </div>
                        ) : null}
                        <div className="text-[11px] text-gray-500 mt-1">
                          {new Date(s.date).toLocaleString()}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <a
                          href={`/ct/sessions/${s.id}`}
                          className="text-[11px] rounded-lg border px-2 py-1 hover:bg-gray-50"
                          title="Ver detalle por ID"
                        >
                          Ver detalle
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
