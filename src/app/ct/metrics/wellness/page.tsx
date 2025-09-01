// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/** ---------- Tipos de datos ---------- */
type WellnessRaw = {
  id: string;
  user?: { name?: string; email?: string };
  userName?: string | null;      // compat
  playerKey?: string | null;     // compat
  date: string;                  // YYYY-MM-DD
  sleepQuality: number;          // 1..5 (5 = mejor)
  sleepHours?: number | null;    // 0..14 (opcional)
  fatigue: number;               // 1..5 (5 = mejor)
  muscleSoreness: number;        // 1..5 (5 = mejor → menor dolor)
  stress: number;                // 1..5 (5 = mejor → menor estrés)
  mood: number;                  // 1..5 (5 = mejor)
  comment?: string | null;
};

type DayRow = WellnessRaw & {
  _userName: string;             // resuelto
  _sdw: number;                  // 1..5
};

type Baseline = {
  mean: number;                  // media SDW (21d)
  sd: number;                    // desvío estándar SDW (21d)
  n: number;                     // días válidos
};

type ZEval = {
  z: number | null;
  baseColor: "green" | "yellow" | "red";
};

type Alert = {
  kind: "CRITICO" | "AMARILLO";
  reason: string;
  userName: string;
  priority: number;              // menor = más urgente
};

type RPERow = {
  userName: string;
  srpe: number;                  // AU
};

/** ---------- Utilidades de fecha ---------- */
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function fromYMD(s: string) { const [y,m,dd] = s.split("-").map(Number); return new Date(y, m-1, dd); }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function yesterday(ymd: string) { return toYMD(addDays(fromYMD(ymd), -1)); }

/** ---------- Cálculos estadísticos ---------- */
function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}
function sdSample(arr: number[]) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((acc,v)=> acc + (v - m)*(v - m), 0) / (n - 1);
  return Math.sqrt(v);
}

/** SDW = promedio (1..5) de los 5 ítems orientados a 5=mejor */
function computeSDW(r: WellnessRaw) {
  const vals = [
    Number(r.sleepQuality||0),
    Number(r.fatigue||0),
    Number(r.muscleSoreness||0),
    Number(r.stress||0),
    Number(r.mood||0),
  ];
  const valid = vals.filter(v => v>0);
  if (!valid.length) return 0;
  return valid.reduce((a,b)=>a+b,0)/valid.length;
}

/** Semáforo por Z-score según especificación */
function zToColor(z: number | null): "green" | "yellow" | "red" {
  if (z === null) return "yellow"; // sin baseline suficiente → atención leve
  if (z >= -0.5) return "green";
  if (z >= -1.0) return "yellow";
  return "red";
}

/** CSS de badges */
function colorClass(c: "green"|"yellow"|"red") {
  if (c === "green")  return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c === "yellow") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function Badge({children, tone}:{children: any; tone: "green"|"yellow"|"red"|"lime"|"orange" }) {
  const map: Record<string,string> = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    lime:   "bg-lime-50 text-lime-700 border-lime-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red:    "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

/** Eleva severidad de color según overrides clínicos */
function applyOverrides(base: "green"|"yellow"|"red", r: DayRow) {
  let level = base; // green < yellow < red
  const sleepH = r.sleepHours ?? null;
  if (sleepH !== null && sleepH < 4) {
    level = level === "green" ? "yellow" : level;
  }
  if (r.muscleSoreness <= 2) {
    level = "red";
  }
  if (r.stress <= 2) {
    level = level === "green" ? "yellow" : level;
  }
  return level;
}

/** Mini sparkline (7 días) usando bloques */
function Sparkline({vals}:{vals:number[]}) {
  if (!vals.length) return <span className="text-gray-400">—</span>;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(1e-6, max-min);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {vals.map((v,i)=>{
        const h = 6 + Math.round(16 * ((v - min)/range)); // 6..22px
        return <div key={i} className="w-1.5 bg-gray-400/60 rounded-sm" style={{height: `${h}px`}} />;
      })}
    </div>
  );
}

/** ---------- Componente principal ---------- */
export default function WellnessCT_Day() {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rowsToday, setRowsToday] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [last7, setLast7] = useState<Record<string, number[]>>({}); // userName -> últimos 7 SDW
  const [srpeYesterday, setSrpeYesterday] = useState<Record<string, number>>({}); // userName -> AU

  // Cache 21d previos por jugador para baseline
  const [baselineMap, setBaselineMap] = useState<Record<string, Baseline>>({});

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [date]);

  async function fetchWellnessDay(d: string): Promise<WellnessRaw[]> {
    const res = await fetch(`/api/metrics/wellness?date=${d}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function fetchRPE(d: string): Promise<RPERow[]> {
    const res = await fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" });
    if (!res.ok) return [];
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr.map((r:any) => ({
      userName: r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
      srpe: Number(r.load ?? r.srpe ?? (Number(r.rpe||0) * Number(r.duration||0)) || 0),
    }));
  }

  async function loadAll() {
    setLoading(true);

    // 1) Día actual
    const today = await fetchWellnessDay(date);
    const todayFixed: DayRow[] = today.map((it:any) => {
      const nm = it.userName || it.user?.name || it.user?.email || it.playerKey || "—";
      return { ...it, _userName: nm, _sdw: computeSDW(it) };
    });

    // 2) Ventana 21 días previos (baseline)
    const prevDays: string[] = Array.from({length:21}, (_,i)=> toYMD(addDays(fromYMD(date), -(i+1))));
    const prevDataChunks = await Promise.all(prevDays.map(d => fetchWellnessDay(d)));
    // por jugador → SDWs
    const map: Record<string, number[]> = {};
    const last7map: Record<string, number[]> = {};
    for (let di = 0; di < prevDataChunks.length; di++) {
      const dayArr = prevDataChunks[di];
      for (const it of dayArr) {
        const nm = it.userName || it.user?.name || it.user?.email || it.playerKey || "—";
        const sdw = computeSDW(it);
        if (!map[nm]) map[nm] = [];
        map[nm].push(sdw);
        if (di < 7) { // primeros 7 del array son ayer..hace 7 días
          if (!last7map[nm]) last7map[nm] = [];
          last7map[nm].push(sdw);
        }
      }
    }
    const baselines: Record<string, Baseline> = {};
    for (const [nm, arr] of Object.entries(map)) {
      const arrClean = arr.filter(v => v>0);
      baselines[nm] = { mean: mean(arrClean), sd: sdSample(arrClean), n: arrClean.length };
    }

    // 3) sRPE de ayer
    const ysrpe = await fetchRPE(yesterday(date));
    const srpeMap: Record<string, number> = {};
    for (const r of ysrpe) srpeMap[r.userName] = r.srpe || 0;

    // 4) Enriquecemos filas de hoy con z-score, color y overrides
    const withStats = todayFixed.map(r => {
      const base = baselines[r._userName];
      const z = base && base.n >= 7 && base.sd > 0 ? (r._sdw - base.mean) / base.sd : null;
      const baseColor = zToColor(z);
      const finalColor = applyOverrides(baseColor, r);
      return { ...r, _z: z, _color: finalColor, _base: base || {mean:0,sd:0,n:0} };
    });

    // 5) Construimos alertas priorizadas
    const alertsList: Alert[] = [];
    for (const r of withStats) {
      const base = r._base as Baseline;
      const z = (r as any)._z as number | null;
      const color = (r as any)._color as "green"|"yellow"|"red";
      const overrides: string[] = [];
      if ((r.sleepHours ?? null) !== null && (r.sleepHours as number) < 4) overrides.push("Sueño <4h");
      if (r.muscleSoreness <= 2) overrides.push("Dolor muscular ≤2");
      if (r.stress <= 2) overrides.push("Estrés ≤2");

      const srpe = srpeMap[r._userName] ?? 0;

      // Reglas de severidad (prioridad baja = más urgente)
      if (color === "red") {
        alertsList.push({
          kind: "CRITICO",
          reason:
            (z !== null && z < -1.0 && base.n >= 7)
              ? `SDW rojo (Z=${z.toFixed(2)})`
              : overrides[0]
                ? `Override: ${overrides.join(", ")}`
                : `SDW rojo`,
          userName: r._userName,
          priority: 1,
        });
      } else if (color === "yellow") {
        alertsList.push({
          kind: "AMARILLO",
          reason:
            (z !== null && z < -0.5 && base.n >= 7)
              ? `Descenso leve (Z=${z.toFixed(2)})`
              : overrides[0]
                ? `Override leve: ${overrides.join(", ")}`
                : `Atención`,
          userName: r._userName,
          priority: 5,
        });
      }

      // Cruce: sRPE alto ayer + SDW rojo hoy → crítica adicional
      if (srpe > 900 && color === "red") {
        alertsList.push({
          kind: "CRITICO",
          reason: `sRPE ayer ${Math.round(srpe)} AU + SDW rojo`,
          userName: r._userName,
          priority: 0,
        });
      }
    }
    alertsList.sort((a,b)=> a.priority - b.priority);

    setRowsToday(withStats);
    setBaselineMap(baselines);
    setLast7(last7map);
    setSrpeYesterday(srpeMap);
    setAlerts(alertsList);
    setLoading(false);
  }

  // Filtro por nombre
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rowsToday;
    return rowsToday.filter(r => r._userName.toLowerCase().includes(t) || (r.comment||"").toLowerCase().includes(t));
  }, [rowsToday, q]);

  // Export CSV según especificación
  function exportCSV() {
    const header = [
      "Jugador","Fecha","Sueño_calidad","Horas_sueño","Fatiga","Dolor_muscular","Estrés","Ánimo",
      "Total_diario","Comentario","Color","Semana_ISO"
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const wk = r.date; // simple; si querés ISO week exacta lo agregamos luego
      const color = (r as any)._color as string;
      lines.push([
        `"${r._userName.replace(/"/g,'""')}"`,
        r.date,
        r.sleepQuality,
        (r.sleepHours ?? "") as any,
        r.fatigue,
        r.muscleSoreness,
        r.stress,
        r.mood,
        (r as any)._sdw.toFixed(2),
        `"${(r.comment||"").replace(/"/g,'""')}"`,
        color.toUpperCase(),
        wk,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wellness_dia_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Wellness — Día (CT)</h1>
          <p className="text-xs text-gray-500">
            {rowsToday.length} registros • Baseline: ventana 21 días previos (min 7 días válidos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e)=> setDate(e.target.value)}
          />
          <button onClick={loadAll} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
          <button onClick={exportCSV} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Exportar CSV</button>
        </div>
      </header>

      {/* Alertas priorizadas */}
      <section className="rounded-xl border bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-semibold uppercase">Alertas</div>
          <div className="text-xs text-gray-500">{alerts.length} alerta(s)</div>
        </div>
        {loading ? (
          <div className="p-2 text-gray-500">Cargando…</div>
        ) : alerts.length === 0 ? (
          <div className="p-2 text-gray-500 italic">Sin alertas</div>
        ) : (
          <ul className="mt-2 space-y-1">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border px-2 py-1">
                <div className="flex items-center gap-2">
                  {a.kind === "CRITICO" ? <Badge tone="red">Rojo</Badge> : <Badge tone="orange">Amarillo</Badge>}
                  <span className="font-medium">{a.userName}</span>
                  <span className="text-sm text-gray-700">— {a.reason}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar por jugador o comentario…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      {/* Tabla principal */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas (día)</div>
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-left px-3 py-2">SDW (1–5)</th>
                  <th className="text-left px-3 py-2">Baseline (μ±σ)</th>
                  <th className="text-left px-3 py-2">Z</th>
                  <th className="text-left px-3 py-2">Color</th>
                  <th className="text-left px-3 py-2">Sueño (h)</th>
                  <th className="text-left px-3 py-2">Peores ítems</th>
                  <th className="text-left px-3 py-2">sRPE ayer</th>
                  <th className="text-left px-3 py-2">Spark 7d</th>
                  <th className="text-left px-3 py-2">Comentario</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a,b)=>{
                    // Orden por severidad: red -> yellow -> green
                    const colorRank = (c:"green"|"yellow"|"red") => c==="red"?0:c==="yellow"?1:2;
                    const ac = (a as any)._color as "green"|"yellow"|"red";
                    const bc = (b as any)._color as "green"|"yellow"|"red";
                    if (colorRank(ac) !== colorRank(bc)) return colorRank(ac) - colorRank(bc);
                    // Luego por Z más bajo primero
                    const az = (a as any)._z; const bz = (b as any)._z;
                    if (az != null && bz != null) return az - bz;
                    return 0;
                  })
                  .map((r) => {
                    const base = (r as any)._base as Baseline;
                    const z = (r as any)._z as number | null;
                    const baseTone = (r as any)._color as "green"|"yellow"|"red";
                    const worst = [
                      {k:"Sueño", v:r.sleepQuality},
                      {k:"Fatiga", v:r.fatigue},
                      {k:"Dolor", v:r.muscleSoreness},
                      {k:"Estrés", v:r.stress},
                      {k:"Ánimo", v:r.mood},
                    ].sort((a,b)=>a.v-b.v).slice(0,2);
                    const spark = (last7[r._userName] || []).slice().reverse(); // ayer..hace 7
                    const srpe = srpeYesterday[r._userName] ?? null;
                    return (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="px-3 py-2 font-medium">{r._userName}</td>
                        <td className="px-3 py-2">{(r as any)._sdw.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {base.n >= 7 ? `${base.mean.toFixed(2)} ± ${base.sd.toFixed(2)} (n=${base.n})` : <span className="text-gray-400">insuficiente</span>}
                        </td>
                        <td className="px-3 py-2">{z!=null ? z.toFixed(2) : "—"}</td>
                        <td className="px-3 py-2"><Badge tone={baseTone}>{baseTone.toUpperCase()}</Badge></td>
                        <td className="px-3 py-2">{r.sleepHours ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {worst.map(w => <div key={w.k}>{w.k}: <b>{w.v}</b></div>)}
                        </td>
                        <td className="px-3 py-2">{srpe!=null ? `${Math.round(srpe)} AU` : "—"}</td>
                        <td className="px-3 py-2"><Sparkline vals={spark} /></td>
                        <td className="px-3 py-2"><span className="text-gray-600">{r.comment || "—"}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Leyenda simple */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Semáforo por Z:</b> verde ≥ −0.5, amarillo [−1.0, −0.5), rojo &lt; −1.0. Overrides: Sueño &lt;4h ⇒ ≥ amarillo; Dolor ≤2 ⇒ rojo; Estrés ≤2 ⇒ ≥ amarillo.
      </div>
    </div>
  );
}
