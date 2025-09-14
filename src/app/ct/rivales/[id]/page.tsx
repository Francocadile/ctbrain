// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

type Rival = {
  id: string;
  name: string;
  logoUrl: string | null;
  coach?: string | null;
  baseSystem?: string | null;
  nextMatchDate?: string | null;        // ISO
  nextMatchCompetition?: string | null;
};

type RivalReport = {
  system?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  keyPlayers?: string[];
  setPieces?: {
    for?: string[];
    against?: string[];
  };
};

type RivalPlan = {
  charlaUrl: string | null;
  report: RivalReport;
};

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const initialTab = (search.get("tab") as Tab) || "resumen";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<Rival | null>(null);

  // ---- Plan de partido (estado y helpers) ----
  const [planLoading, setPlanLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [charlaUrl, setCharlaUrl] = useState<string>("");

  // Campos multilinea -> arrays por línea
  const [repSystem, setRepSystem] = useState<string>("");
  const [repStrengths, setRepStrengths] = useState<string>(""); // 1 ítem por línea
  const [repWeaknesses, setRepWeaknesses] = useState<string>("");
  const [repKeyPlayers, setRepKeyPlayers] = useState<string>("");
  const [repSetFor, setRepSetFor] = useState<string>("");
  const [repSetAgainst, setRepSetAgainst] = useState<string>("");

  const linesToArray = (v: string) =>
    v.split("\n").map(s => s.trim()).filter(Boolean);
  const arrayToLines = (arr?: string[]) => (arr && arr.length ? arr.join("\n") : "");

  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  // ---- Carga Rival ----
  async function loadRival() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setRival(json.data as Rival); // <- la API devuelve { data }
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

  // ---- Carga Plan ----
  async function loadPlan() {
    if (!id) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/plan`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const plan = (json.data || { charlaUrl: null, report: {} }) as RivalPlan;

        setCharlaUrl(plan.charlaUrl || "");
        setRepSystem(plan.report.system || "");
        setRepStrengths(arrayToLines(plan.report.strengths));
        setRepWeaknesses(arrayToLines(plan.report.weaknesses));
        setRepKeyPlayers(arrayToLines(plan.report.keyPlayers));
        setRepSetFor(arrayToLines(plan.report.setPieces?.for));
        setRepSetAgainst(arrayToLines(plan.report.setPieces?.against));
      } else {
        // Inicial vacío
        setCharlaUrl("");
        setRepSystem("");
        setRepStrengths("");
        setRepWeaknesses("");
        setRepKeyPlayers("");
        setRepSetFor("");
        setRepSetAgainst("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPlanLoading(false);
    }
  }

  async function savePlan() {
    if (!id) return;
    setSavingPlan(true);
    try {
      const payload: RivalPlan = {
        charlaUrl: charlaUrl.trim() || null,
        report: {
          system: repSystem.trim() || null,
          strengths: linesToArray(repStrengths),
          weaknesses: linesToArray(repWeaknesses),
          keyPlayers: linesToArray(repKeyPlayers),
          setPieces: {
            for: linesToArray(repSetFor),
            against: linesToArray(repSetAgainst),
          },
        },
      };

      const res = await fetch(`/api/ct/rivales/${id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("No se pudo guardar el plan");
      // Opcional: refrescar plan desde backend
      await loadPlan();
      alert("Plan guardado");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al guardar");
    } finally {
      setSavingPlan(false);
    }
  }

  useEffect(() => {
    loadRival();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab === "plan") loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  const nextMatchLabel = useMemo(() => {
    if (!rival?.nextMatchDate) return null;
    try {
      const d = new Date(rival.nextMatchDate);
      const dateStr = d.toLocaleDateString();
      const comp = rival.nextMatchCompetition ? ` • ${rival.nextMatchCompetition}` : "";
      return `${dateStr}${comp}`;
    } catch {
      return rival.nextMatchCompetition || null;
    }
  }, [rival?.nextMatchDate, rival?.nextMatchCompetition]);

  if (loading) {
    return <div className="p-4 text-gray-500">Cargando…</div>;
  }

  if (!rival) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-500">Rival no encontrado</div>
        <Link href="/ct/rivales" className="text-sm underline">← Volver a Rivales</Link>
      </div>
    );
  }

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
            Próximo partido: {nextMatchLabel || "—"}
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
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Resumen</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><b>DT:</b> {rival.coach || "—"}</li>
              <li><b>Sistema base:</b> {rival.baseSystem || "—"}</li>
              <li>
                <b>Próximo partido:</b>{" "}
                {nextMatchLabel || "—"}
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              (Estos campos se editan desde la ficha del rival o por backend; luego podemos agregar un editor rápido aquí.)
            </p>
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan de partido</h2>
              {planLoading && <span className="text-xs text-gray-500">Cargando plan…</span>}
            </div>

            {/* Charla oficial (solo CT) */}
            <div className="space-y-1">
              <label className="text-[11px] text-gray-500">
                Charla oficial (URL a PDF/PPT/Keynote) — <b>solo CT</b>
              </label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="https://drive.google.com/..."
                value={charlaUrl}
                onChange={(e) => setCharlaUrl(e.target.value)}
              />
              {charlaUrl ? (
                <a
                  href={charlaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline text-emerald-700"
                >
                  Abrir charla en nueva pestaña
                </a>
              ) : null}
            </div>

            {/* Informe visual (CT + jugadores) */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">Sistema</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder='p.ej. "4-3-3"'
                  value={repSystem}
                  onChange={(e) => setRepSystem(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] text-gray-500">Jugadores clave (1 por línea)</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm min-h-24"
                  placeholder={"Ejemplo:\nN°9 Centrodelantero\nExtremo derecho veloz"}
                  value={repKeyPlayers}
                  onChange={(e) => setRepKeyPlayers(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] text-gray-500">Fortalezas (1 por línea)</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm min-h-24"
                  placeholder={"Ejemplo:\nTransiciones rápidas\nJuego aéreo ofensivo"}
                  value={repStrengths}
                  onChange={(e) => setRepStrengths(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] text-gray-500">Debilidades (1 por línea)</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm min-h-24"
                  placeholder={"Ejemplo:\nLaterales dejan espacios\nSalida bajo presión"}
                  value={repWeaknesses}
                  onChange={(e) => setRepWeaknesses(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] text-gray-500">Balón parado — A favor (1 por línea)</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm min-h-24"
                  placeholder={"Ejemplo:\nCórner cerrado primer palo\nTiro libre indirecto jugada 3"}
                  value={repSetFor}
                  onChange={(e) => setRepSetFor(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] text-gray-500">Balón parado — En contra (1 por línea)</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm min-h-24"
                  placeholder={"Ejemplo:\nDefienden en zona\nDebilidad segundo palo"}
                  value={repSetAgainst}
                  onChange={(e) => setRepSetAgainst(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={savePlan}
                disabled={savingPlan || planLoading}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  savingPlan || planLoading
                    ? "bg-gray-200 text-gray-500"
                    : "bg-black text-white hover:opacity-90"
                }`}
              >
                {savingPlan ? "Guardando…" : "Guardar plan"}
              </button>
            </div>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            <p className="text-sm text-gray-600">
              Clips del rival y nuestros enfrentamientos (pendiente de implementar).
            </p>
          </div>
        )}

        {tab === "stats" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
            <p className="text-sm text-gray-600">
              Últimos partidos, goles a favor/en contra, posesión (pendiente de implementar).
            </p>
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">
              Solo visible para CT: observaciones y checklist (pendiente de implementar).
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
