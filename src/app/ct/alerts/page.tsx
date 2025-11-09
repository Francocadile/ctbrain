// src/app/ct/alerts/page.tsx
"use client";

import { useEffect, useState } from "react";

type AlertItem = {
  userId: string;
  name: string;
  date: string;
  sdw: number;
  baselineMean: number | null;
  z: number | null;
  color: "green"|"yellow"|"red";
  srpePrev: number;
  severity: "CRITICAL" | "WARN" | "OK";
  reasons: string[];
  suggestions: string[];
};

function todayYMD() { return new Date().toISOString().slice(0,10); }
function toneClass(c: "green"|"yellow"|"red") {
  const map: Record<string,string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow:"bg-amber-50 text-amber-700 border-amber-200",
    red:   "bg-red-50 text-red-700 border-red-200",
  };
  return map[c];
}
function sevPill(s: AlertItem["severity"]) {
  const map: Record<AlertItem["severity"], string> = {
    CRITICAL: "bg-red-600 text-white",
    WARN: "bg-amber-500 text-white",
    OK: "bg-gray-300 text-gray-800",
  };
  return map[s];
}

export default function AlertsPage() {
  const [date, setDate] = useState<string>(todayYMD());
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AlertItem[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/alerts/daily?date=${date}`, { cache: "no-store" });
    const json = await res.json();
    setItems(Array.isArray(json.items) ? json.items : []);
    setLoading(false);
  }

  useEffect(()=>{ load(); /* eslint-disable-line */ }, [date]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Alertas del día</h1>
          <p className="text-xs text-gray-500">Priorizadas por severidad (reglas: SDW + baseline 21d + overrides + sRPE ayer)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e)=> setDate(e.target.value)}
          />
          <button onClick={load} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">Recargar</button>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-500">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 italic">Sin alertas para {date}.</div>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Alertas</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-left px-3 py-2">SDW</th>
                  <th className="text-left px-3 py-2">Baseline</th>
                  <th className="text-left px-3 py-2">Z</th>
                  <th className="text-left px-3 py-2">Color</th>
                  <th className="text-left px-3 py-2">sRPE ayer</th>
                  <th className="text-left px-3 py-2">Severidad</th>
                  <th className="text-left px-3 py-2">Motivos</th>
                  <th className="text-left px-3 py-2">Sugerencia</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.userId} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 font-medium">{it.name}</td>
                    <td className="px-3 py-2">{it.sdw.toFixed(2)}</td>
                    <td className="px-3 py-2">{it.baselineMean != null ? it.baselineMean.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2">{it.z != null ? it.z.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${toneClass(it.color)}`}>
                        {it.color.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2">{it.srpePrev ? `${it.srpePrev} AU` : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${sevPill(it.severity)}`}>
                        {it.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <ul className="list-disc pl-5 text-gray-700">
                        {it.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {it.suggestions[0] || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
