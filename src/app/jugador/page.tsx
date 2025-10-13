// src/app/jugador/page.tsx
"use client";


import Link from "next/link";
import { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-2 inline-block bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{count} sin ver</span>
  );
}

export default function JugadorHome() {
  const [pendientes, setPendientes] = useState({ material: 0, videos: 0 });

  useEffect(() => {
    async function fetchPendientes() {
      // Material
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const assets = await getJSON<any[]>(`/api/assets?weekStart=${weekStart.toISOString()}`);
      const videos = await getJSON<any[]>(`/api/videos`);
      const viewlog = await getJSON<{ logs: any[]; conteo: Record<string, number> }>(`/api/viewlog`);
      // Filtrar logs del usuario y tipo
      const userId = viewlog.logs[0]?.userId;
      const vistosMaterial = viewlog.logs.filter(l => l.entityType === "ASSET" && assets.some(a => a.id === l.entityId) && l.userId === userId).map(l => l.entityId);
      const vistosVideos = viewlog.logs.filter(l => l.entityType === "VIDEO" && videos.some(v => v.id === l.entityId) && l.userId === userId).map(l => l.entityId);
      setPendientes({
        material: assets.length - new Set(vistosMaterial).size,
        videos: videos.length - new Set(vistosVideos).size,
      });
    }
    fetchPendientes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/jugador/rutina"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50 flex flex-col justify-between"
        >
          <h2 className="font-semibold text-lg mb-2">Rutina de fuerza</h2>
          <p className="text-sm text-gray-600">Ejercicios y bloques asignados por el CT.</p>
        </Link>
        <Link
          href="/jugador/material"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50 flex flex-col justify-between"
        >
          <h2 className="font-semibold text-lg mb-2">Material de la semana <Badge count={pendientes.material} /></h2>
          <p className="text-sm text-gray-600">PDFs, enlaces y notas compartidas por el CT.</p>
        </Link>
        <Link
          href="/jugador/videos"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50 flex flex-col justify-between"
        >
          <h2 className="font-semibold text-lg mb-2">Videos del DT <Badge count={pendientes.videos} /></h2>
          <p className="text-sm text-gray-600">Videos técnicos y tácticos asignados.</p>
        </Link>
        <Link
          href="/jugador/wellness"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50 flex flex-col justify-between"
        >
          <h2 className="font-semibold text-lg mb-2">Wellness diario</h2>
          <p className="text-sm text-gray-600">Sueño, fatiga, dolor muscular, estrés, ánimo (+ horas de sueño).</p>
        </Link>
        <Link
          href="/jugador/rpe"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50 flex flex-col justify-between"
        >
          <h2 className="font-semibold text-lg mb-2">RPE post-entrenamiento</h2>
          <p className="text-sm text-gray-600">RPE 0–10. La duración la completa el CT.</p>
        </Link>
      </div>
    </div>
  );
}
