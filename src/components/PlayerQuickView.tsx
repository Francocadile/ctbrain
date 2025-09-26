"use client";
import * as React from "react";

function Bars({ values, maxHint = 10, height = 60 }: { values: number[]; maxHint?: number; height?: number }) {
  const max = Math.max(maxHint, ...values, 1);
  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className="bg-gray-800 rounded-sm"
          title={String(v)}
          style={{ width: 10, height: Math.max(2, Math.round((v / max) * (height - 10))) }}
        />
      ))}
    </div>
  );
}

export default function PlayerQuickView({
  open,
  onClose,
  loading,
  playerName,
  date,
  sdw7,
  rpeRecent,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  playerName: string | null;
  date: string;
  sdw7: number[];
  rpeRecent: { date: string; au: number }[];
}) {
  if (!open || !playerName) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-gray-500">Quick view</div>
            <h3 className="text-lg font-bold">{playerName}</h3>
            <div className="text-xs text-gray-500">Fecha base: {date}</div>
          </div>
          <button onClick={onClose} className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50">Cerrar</button>
        </div>

        {loading ? (
          <div className="mt-4 text-gray-500">Cargando…</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-[11px] uppercase text-gray-500 mb-1">Wellness (últimos 7–8 días) — SDW</div>
              <Bars values={sdw7} maxHint={5} />
            </div>
            <div>
              <div className="text-[11px] uppercase text-gray-500 mb-1">sRPE reciente (AU)</div>
              <Bars values={rpeRecent.map((x) => x.au)} maxHint={1200} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
