// src/app/ct/rivales/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

type Rival = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<Rival | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ct/rivals/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRival(data);
      } else {
        setRival(null);
      }
    } catch (e) {
      console.error(e);
      setRival(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="p-4 text-gray-500">Cargando…</div>;
  }

  if (!rival) {
    return <div className="p-4 text-red-500">Rival no encontrado</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex items-center gap-4 border-b pb-3">
        {rival.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rival.logoUrl}
            alt={rival.name}
            className="h-16 w-16 rounded border object-contain bg-white"
          />
        ) : (
          <div className="h-16 w-16 rounded border bg-gray-100" />
        )}
        <div>
          <h1 className="text-xl font-bold">{rival.name}</h1>
          <p className="text-sm text-gray-600">
            {/* Placeholder, luego lo traemos de la DB */}
            DT: <b>—</b> • Sistema base: —
          </p>
          <p className="text-sm text-gray-600">Próximo partido: —</p>
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
              tab === t.key
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black"
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
            <p className="text-sm text-gray-600">
              Aquí se mostrarán datos básicos del rival (DT, sistema, próximos
              partidos).
            </p>
          </div>
        )}

        {tab === "plan" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Plan de partido</h2>
            <p className="text-sm text-gray-600">
              Aquí el CT podrá subir la charla oficial y un informe visual.
            </p>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            <p className="text-sm text-gray-600">
              Clips del rival y nuestros enfrentamientos.
            </p>
          </div>
        )}

        {tab === "stats" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
            <p className="text-sm text-gray-600">
              Últimos partidos, goles a favor/en contra, posesión.
            </p>
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">
              Solo visible para CT: observaciones y checklist.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
