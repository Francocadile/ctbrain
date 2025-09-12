// src/app/ct/rivales/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("resumen");

  // TODO: luego conectar a DB/API. Por ahora mock:
  const rival = {
    id,
    name: "Club Atlético Ejemplo",
    logoUrl: "https://via.placeholder.com/80x80.png?text=Logo",
    coach: "DT Ejemplo",
    system: "1-4-3-3",
    nextMatch: "Fecha 12 — vs Nosotros",
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex items-center gap-4 border-b pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rival.logoUrl}
          alt={rival.name}
          className="h-16 w-16 rounded border object-contain bg-white"
        />
        <div>
          <h1 className="text-xl font-bold">{rival.name}</h1>
          <p className="text-sm text-gray-600">
            DT: <b>{rival.coach}</b> • Sistema base: {rival.system}
          </p>
          <p className="text-sm text-gray-600">{rival.nextMatch}</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 border-b">
        {[
          { key: "resumen", label: "Resumen" },
          { key: "plan", label: "Plan de partido" },
          { key: "videos", label: "Videos" },
          { key: "stats", label: "Estadísticas" },
          { key: "notas", label: "Notas internas" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              tab === t.key ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Contenido por tab */}
      <section className="rounded-xl border bg-white p-4">
        {tab === "resumen" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Resumen</h2>
            <p className="text-sm text-gray-600">Escudo, nombre, DT, sistema base y próximos partidos.</p>
          </div>
        )}

        {tab === "plan" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Plan de partido</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li><b>Charla oficial</b> (solo CT) → Subir archivo PDF/PPT.</li>
              <li><b>Informe rival</b> (CT + jugadores) → fortalezas, debilidades, jugadores clave, balón parado.</li>
            </ul>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            <p className="text-sm text-gray-600">Clips del rival y nuestros contra ellos.</p>
          </div>
        )}

        {tab === "stats" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
            <p className="text-sm text-gray-600">Últimos 5 partidos, goles a favor/en contra, posesión, etc.</p>
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">Solo visible para el CT. Observaciones y checklist.</p>
          </div>
        )}
      </section>
    </div>
  );
}
