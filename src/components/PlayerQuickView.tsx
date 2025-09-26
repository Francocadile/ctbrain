// src/components/PlayerQuickView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeSDW,
  toYMD,
  fromYMD,
  addDays,
  type WellnessRaw,
  mean,
} from "@/lib/metrics/wellness";
import { srpeOf, type RPERow } from "@/lib/metrics/rpe";

type Props = {
  open: boolean;
  onClose: () => void;
  playerName: string | null; // nombre resuelto (userName || playerKey || email)
  date: string; // YYYY-MM-DD (ancla, hoy de la vista)
};

type RPERowAny = RPERow & { date?: string };

function Section({ title, children }: { title: string; children: any }) {
  return (
    <section className="rounded-xl border bg-white p-3">
      <div className="text-[12px] font-semibold uppercase mb-1">{title}</div>
      {children}
    </section>
  );
}

function BarsInline({
  values,
  maxHint,
  height = 60,
  barWidth = 12,
  gap = 4,
  titlePrefix = "",
  tone = "emerald",
}: {
  values: number[];
  maxHint?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  titlePrefix?: string;
  tone?: "gray" | "emerald" | "amber" | "red";
}) {
  const max = Math.max(maxHint ?? 0, ...values, 1);
  const toneCls: Record<string, string> = {
    gray: "bg-gray-300",
    emerald: "bg-emerald-400/80",
    amber: "bg-amber-400/80",
    red: "bg-red-400/80",
  };
  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height }}>
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * (height - 10)));
        return (
          <div
            key={i}
            title={`${titlePrefix}${v}`}
            className={`rounded-sm ${toneCls[tone]}`}
            style={{ width: barWidth, height: h, marginRight: gap }}
          />
        );
      })}
    </div>
  );
}

export default function PlayerQuickView({ open, onClose, playerName, date }: Props) {
  const [loading, setLoading] = useState(false);
  const [last7SDW, setLast7SDW] = useState<number[]>([]); // hoy .. hace 6 días
  const [todayRow, setTodayRow] = useState<WellnessRaw | null>(null);

  const [lastRPE, setLastRPE] = useState<RPERowAny[]>([]); // últimos 5 con AU (por fecha desc)

  useEffect(() => {
    if (!open || !playerName) return;
    (async () => {
      setLoading(true);
      try {
        // ---- WELLNESS: hoy..hace 6 días ----
        const daysW = Array.from({ length: 7 }, (_, i) =>
          toYMD(addDays(fromYMD(date), -i))
        );
        const chunks = await Promise.all(
          daysW.map((d) =>
            fetch(`/api/metrics/wellness?date=${d}`, { cache: "no-store" }).then((r) =>
              r.ok ? r.json() : []
            )
          )
        );
        const sdwVals: number[] = [];
        let today: WellnessRaw | null = null;
        for (let i = 0; i < chunks.length; i++) {
          const rows: WellnessRaw[] = Array.isArray(chunks[i]) ? chunks[i] : [];
          const mine = rows.find(
            (r: any) =>
              (r.userName ||
                r.user?.name ||
                r.user?.email ||
                r.playerKey ||
                "—") === playerName
          );
          if (i === 0) today = mine ?? null;
          sdwVals.push(mine ? Number(computeSDW(mine).toFixed(2)) : 0);
        }
        setTodayRow(today);
        setLast7SDW(sdwVals);

        // ---- RPE: mirar 10 días hacia atrás y quedarnos con últimos 5 con AU ----
        const daysR = Array.from({ length: 10 }, (_, i) =>
          toYMD(addDays(fromYMD(date), -i))
        );
        const rpeChunks = await Promise.all(
          daysR.map((d) =>
            fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" }).then((r) =>
              r.ok ? r.json() : []
            )
          )
        );
        const mineRPE: RPERowAny[] = [];
        for (let i = 0; i < rpeChunks.length; i++) {
          const rows: any[] = Array.isArray(rpeChunks[i]) ? rpeChunks[i] : [];
          for (const rr of rows) {
            const nm =
              rr.userName || rr.playerKey || rr.user?.name || rr.user?.email || "Jugador";
            if (nm === playerName) {
              mineRPE.push({ ...rr, date: daysR[i] });
            }
          }
        }
        const withAU = mineRPE
          .map((r) => ({ ...r, _au: srpeOf(r) }))
          .filter((r) => r._au && !Number.isNaN(r._au)) as (RPERowAny & { _au: number })[];
        withAU.sort((a, b) => (b.date! > a.date! ? 1 : b.date! < a.date! ? -1 : 0));
        setLastRPE(withAU.slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, playerName, date]);

  const sdwAvg7 = useMemo(
    () => (last7SDW.length ? Number(mean(last7SDW).toFixed(2)) : null),
    [last7SDW]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-gray-500">Resumen rápido</div>
            <div className="text-lg font-bold">{playerName || "Jugador"}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-3 overflow-auto">
          {loading ? (
            <div className="text-gray-500">Cargando…</div>
          ) : (
            <>
              <Section title="Wellness — últimos 7 días">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-gray-500">SDW promedio (7d)</div>
                    <div className="text-xl font-semibold">{sdwAvg7 ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Hoy</div>
                    <div className="text-xl font-semibold">
                      {todayRow ? computeSDW(todayRow).toFixed(2) : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <BarsInline values={last7SDW} maxHint={5} titlePrefix="SDW: " />
                  <div className="mt-1 text-[11px] text-gray-500">
                    Serie: hoy → hace 6 días (más alto = mejor)
                  </div>
                </div>
                {todayRow && (
                  <div className="mt-2 text-xs text-gray-700 grid grid-cols-2 gap-1">
                    <div>Sueño: <b>{todayRow.sleepQuality}</b></div>
                    <div>Horas: <b>{todayRow.sleepHours ?? "—"}</b></div>
                    <div>Fatiga: <b>{todayRow.fatigue}</b></div>
                    <div>Dolor: <b>{todayRow.muscleSoreness}</b></div>
                    <div>Estrés: <b>{todayRow.stress}</b></div>
                    <div>Ánimo: <b>{todayRow.mood}</b></div>
                  </div>
                )}
              </Section>

              <Section title="RPE — últimos registros">
                {lastRPE.length === 0 ? (
                  <div className="text-gray-500 text-sm">Sin AU recientes</div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                      <div>Fecha</div>
                      <div>RPE × min</div>
                      <div className="text-right">sRPE (AU)</div>
                    </div>
                    {lastRPE.map((r, i) => {
                      const au = srpeOf(r);
                      return (
                        <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                          <div>{r.date}</div>
                          <div>
                            {Number(r.rpe).toFixed(0)} × {r.duration ?? "—"}
                          </div>
                          <div className="text-right font-semibold">
                            {au ? Math.round(au) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
