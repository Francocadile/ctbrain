// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

type Rival = {
  id: string;
  name: string;
  logoUrl: string | null;
  coach: string | null;
  baseSystem: string | null;
  nextMatchDate: string | null;        // ISO string
  nextMatchCompetition: string | null;
};

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const initialTab = (search.get("tab") as Tab) || "resumen";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<Rival | null>(null);

  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setRival(null);
      } else {
        const json = await res.json();
        setRival(json?.data ?? null); // ✅ ahora consumimos { data }
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
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-500">Rival no encontrado</div>
        <Link href="/ct/rivales" className="text-sm underline">
          ← Volver a Rivales
        </Link>
      </div>
    );
  }

  const nextMatchPretty =
    rival.nextMatchDate
      ? new Date(rival.nextMatchDate).toLocaleDateString()
      : "—";

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-600">
        <Link href="/ct/rivales" className="underline">Rivales</Link>
        <span className="mx-1">/</span>
        <span className="font-medium">{rival.name}</span>
      </div>

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
            DT: <b>{rival.coach || "—"}</b> • Sistema base: {rival.baseSystem || "—"}
          </p>
          <p className="text-sm text-gray-600">
            Próximo partido: {nextMatchPretty}
            {rival.nextMatchCompetition ? ` • ${rival.nextMatchCompetition}` : ""}
          </p>
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
            onClick={() => switchTab(t.key as Tab)}
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
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Resumen</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">Director Técnico</div>
                <div className="text-sm font-medium">{rival.coach || "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">Sistema base</div>
                <div className="text-sm font-medium">{rival.baseSystem || "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">Próximo partido</div>
                <div className="text-sm font-medium">
                  {nextMatchPretty}
                  {rival.nextMatchCompetition ? ` • ${rival.nextMatchCompetition}` : ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Plan de partido</h2>
            <p className="text-sm text-gray-600">
              Aquí el CT podrá subir la charla oficial (solo CT) y el informe visual (CT + jugadores).
            </p>
          </div>
        )}

        {tab === "videos" && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Videos</h2>
            <p className="text-sm text-gray-600">Clips del rival y nuestros enfrentamientos.</p>
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Estadísticas</h2>
            <p className="text-sm text-gray-600">Últimos partidos, GF/GC, posesión, etc.</p>
          </div>
        )}

        {tab === "notas" && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Notas internas</h2>
            <p className="text-sm text-gray-600">Solo visible para CT: observaciones y checklist.</p>
          </div>
        )}
      </section>
    </div>
  );
}
