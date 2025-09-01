// src/app/ct/metrics/rpe/semana/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/** =============== Tipos =============== */
type RPERaw = {
  id: string;
  user?: { name?: string; email?: string };
  userName?: string | null;
  playerKey?: string | null;
  date: string;        // YYYY-MM-DD
  rpe?: number | null; // 0..10
  duration?: number | null; // min
  srpe?: number | null;     // AU
  load?: number | null;     // AU (compat)
  comment?: string | null;
};

type WeekAgg = {
  userName: string;
  daysAU: number[];     // 7 valores L..D
  totalAU: number;      // suma semanal
  acute7: number;       // = totalAU (semana seleccionada)
  chronic28: number;    // promedio 28d * 7
  acwr: number | null;  // acute7 / chronic28 (si chronic28=0 => null)
  mean: number;         // media diaria semana
  sd: number;           // sd diaria semana
  monotony: number | null; // mean/sd (si sd=0 => null)
  strain: number | null;   // totalAU * monotony (si monotony null => null)
};

/** =============== Utilidades fecha =============== */
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function mondayOf(date: Date) {
  const x = new Date(date);
  const dow = x.getDay(); // 0=Dom, 1=Lun
  const diff = (dow === 0 ? -6 : 1 - dow);
  return addDays(x, diff);
}

/** =============== Stats helpers =============== */
function mean(arr: number[]) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function sdSample(arr: number[]) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((acc,v)=>acc+(v-m)*(v-m),0)/(n-1);
  return Math.sqrt(v);
}

/** =============== UI helpers =============== */
function badgeToneACWR(v: number | null): "green"|"yellow"|"red"|"gray" {
  if (v == null || !isFinite(v)) return "gray";
  if (v < 0.8 || v > 1.5) return "red";
  if (v <= 1.3) return "green";
  return "yellow";
}
function badgeToneAU(total: number): "green"|"yellow"|"red" {
  if (total < 1500) return "yellow"; // posible subcarga
  if (total > 4500) return "red";    // sobrecarga
  return "green";                    // zona razonable
}
function badgeClass(t: "green"|"yellow"|"red"|"gray") {
  const map: Record<string,string> = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red:    "bg-red-50 text-red-700 border-red-200",
    gray:   "bg-gray-100 text-gray-700 border-gray-200",
  };
  return map[t];
}
function Badge({children, tone}:{children:any; tone:"green"|"yellow"|"red"|"gray"}) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeClass(tone)}`}>{children}</span>;
}

/** =============== Fetch helpers =============== */
async function fetchRpeDay(ymd: string): Promise<RPERaw[]> {
  const res = await fetch(`/api/metrics/rpe?date=${ymd}`, { cache: "no-store" });
  if (!res.ok) return [];
  const arr = await res.json();
  return Array.isArray(arr) ? arr : [];
}
function resolveName(r: RPERaw) {
  return r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador";
}
function resolveAU(r: RPERaw): number {
  const au =
    (r.load ?? r.srpe ?? (Number(r.rpe ?? 0) * Number(r.duration ?? 0))) ?? 0;
  return Math.max(0, Math.round(Number(au))); // AU entero, ≥0
}

/** =============== Componente =============== */
export default function RPESemanaCT() {
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [loading, setLoading] = useState(false);
  const [weekDays, setWeekDays] = useState<string[]>([]); // 7 fechas L..D
  const [prev28Days, setPrev28Days] = useState<string[]>([]); // 28 días antes de la semana
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<WeekAgg[]>([]);

  // recomputar fechas al mover semana
  useEffect(() => {
    const days7 = Array.from({length:7}, (_,i)=> toYMD(addDays(monday, i)));
    setWeekDays(days7);
    const startPrev = addDays(monday, -28);
    const prev28 = Array.from({length:28}, (_,i)=> toYMD(addDays(startPrev, i)));
    setPrev28Days(prev28);
  }, [monday]);

  // cargar datos
  useEffect(() => { if (weekDays.length === 7 && prev28Days.length === 28) load(); /* eslint-disable-next-line */ }, [weekDays.join(","), prev28Days.join(",")]);

  async function load() {
    setLoading(true);
    try {
      // 1) Traer 7 días de la semana
      const weekChunks = await Promise.all(weekDays.map(d => fetchRpeDay(d)));
      // user -> AU por día (7)
      const mapWeek: Record<string, number[]> =
