"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyLoadPoint, WeeklyResponsePoint } from "@/lib/directivo-metrics";

export function LoadChart({ data }: { data: WeeklyLoadPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-400">Sin datos de carga en la ventana analizada.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: any) => Number(value).toLocaleString("es-AR")} />
          <Bar dataKey="sessions" name="Sesiones" fill="#0891b2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResponseChart({ data }: { data: WeeklyResponsePoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-400">Sin datos de respuestas en la ventana analizada.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
          <Tooltip formatter={(value: any) => `${Number(value).toFixed(0)}%`} />
          <Line
            type="monotone"
            dataKey="responseRate"
            name="% respuesta"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
