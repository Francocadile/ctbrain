"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Días (lunes a domingo)
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type WeekAPI = {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  days: Record<
    string,
    Array<{
      id: string;
      title: string;
      description: string | null;
      date: string; // ISO
      createdBy: { id: string; name: string | null; email: string | null } | null;
      players: Array<{ id: string; name: string | null; email: string | null; role: string }>;
    }>
  >;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Lunes de la semana (en UTC para ser coherentes con el endpoint)
function getMondayUTC(base: Date) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const day = d.getUTCDay(); // 0..6 (0 = Sun)
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default function CTWeeklyPlan() {
  const [weekStart, setWeekStart] = useState<string>(() => {
    const monday = getMondayUTC(new Date());
    return toISODate(monday);
  });
  const [data, setData] = useState<WeekAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchWeek = async (start: string) => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/sessions/week?start=${start}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar la semana");
      setData(json as WeekAPI);
    } catch (e: any) {
      setErr(e.message || "Error cargando semana");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeek(weekStart);
  }, [weekStart]);

  const daysArray = useMemo(() => {
    if (!data?.weekStart) return [];
    const start = new Date(`${data.weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const key = toISODate(d);
      return {
        key,
        label: DAY_LABELS[i],
        human: new Date(d).toLocaleDateString(undefined, {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }),
        sessions: data.days[key] ?? [],
      };
    });
  }, [data]);

  const goPrevWeek = () => {
    const d = new Date(`${weekStart}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    setWeekStart(toISODate(d));
  };
  const goNextWeek = () => {
    const d = new Date(`${weekStart}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    setWeekStart(toISODate(d));
  };
  const goToday = () => {
    const monday = getMondayUTC(new Date());
    setWeekStart(toISODate(monday));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plan Semanal</h1>
          <p className="text-sm text-gray-500">
            Sesiones reales desde la base de datos (sin mock)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrevWeek} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50">
            ◀︎ Anterior
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50">
            Hoy
          </button>
          <button onClick={goNextWeek} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50">
            Siguiente ▶︎
          </button>
        </div>
      </header>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando semana…</div>
      ) : !data ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No se pudo cargar la semana.
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-600">
            Semana: <span className="font-mono">{data.weekStart}</span> →{" "}
            <span className="font-mono">{data.weekEnd}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {daysArray.map((d) => (
              <section key={d.key} className="rounded-xl border p-3 min-h-[160px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-xs text-gray-500">{d.human}</div>
                </div>

                {d.sessions.length === 0 ? (
                  <div className="text-xs text-gray-400">Sin sesiones</div>
                ) : (
                  <ul className="space-y-2">
                    {d.sessions.map((s) => (
                      <li key={s.id} className="rounded-lg border p-2">
                        <div className="text-xs text-gray-500">
                          {new Date(s.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-sm font-medium">
                          <Link href={`/ct/sessions/${s.id}`} className="hover:underline">
                            {s.title}
                          </Link>
                        </div>
                        {s.players?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.players.slice(0, 3).map((p) => (
                              <span key={p.id} className="text-[11px] rounded-full border px-2 py-0.5">
                                {p.name || p.email || p.id}
                              </span>
                            ))}
                            {s.players.length > 3 && (
                              <span className="text-[11px] text-gray-500">+{s.players.length - 3}</span>
                            )}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="pt-2">
            <Link href="/ct/sessions" className="text-sm underline">
              Ir a “Sesiones”
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
