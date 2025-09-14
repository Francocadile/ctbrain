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
  nextMatchDate?: string | null;
  nextMatchCompetition?: string | null;
};

type RivalReport = {
  system?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  keyPlayers?: string[];
  setPieces?: { for?: string[]; against?: string[] };
};

type RivalPlan = {
  charlaUrl: string | null;
  report: RivalReport;
};

// ---------------- utils ----------------
function arrToLines(a?: string[]) {
  return (a || []).join("\n");
}
function linesToArr(s: string) {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}
function safeGetData<T = any>(json: any): T {
  return (json && (json.data ?? json)) as T;
}
function isoToDateInput(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// ---------------- page ----------------
export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const initialTab = (search.get("tab") as Tab) || "resumen";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<Rival | null>(null);

  // Resumen (edición)
  const [editResumen, setEditResumen] = useState(false);
  const [savingResumen, setSavingResumen] = useState(false);
  const [resumenForm, setResumenForm] = useState<{
    coach: string;
    baseSystem: string;
    nextMatchDate: string; // yyyy-mm-dd
    nextMatchCompetition: string;
  }>({ coach: "", baseSystem: "", nextMatchDate: "", nextMatchCompetition: "" });

  // Plan
  const [planLoading, setPlanLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<RivalPlan>({
    charlaUrl: null,
    report: { system: null, strengths: [], weaknesses: [], keyPlayers: [], setPieces: { for: [], against: [] } },
  });

  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  async function loadRival() {
    if (!id) return;
    try {
      const res = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("not ok");
      const json = await res.json();
      const r = safeGetData<Rival>(json);
      setRival(r);
      // sync form resumen
      setResumenForm({
        coach: r.coach ?? "",
        baseSystem: r.baseSystem ?? "",
        nextMatchDate: isoToDateInput(r.nextMatchDate),
        nextMatchCompetition: r.nextMatchCompetition ?? "",
      });
    } catch {
      setRival(null);
    }
  }

  async function loadPlan() {
    if (!id) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/plan`, { cache: "no-store" });
      if (!res.ok) throw new Error("not ok");
      const json = await res.json();
      const p = safeGetData<RivalPlan>(json);
      setPlan({
        charlaUrl: p.charlaUrl ?? null,
        report: {
          system: p.report?.system ?? null,
          strengths: p.report?.strengths ?? [],
          weaknesses: p.report?.weaknesses ?? [],
          keyPlayers: p.report?.keyPlayers ?? [],
          setPieces: {
            for: p.report?.setPieces?.for ?? [],
            against: p.report?.setPieces?.against ?? [],
          },
        },
      });
    } catch {
      // deja plan por defecto
    } finally {
      setPlanLoading(false);
    }
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadPlan();
    } catch (err: any) {
      alert(err?.message || "No se pudo guardar el plan");
    } finally {
      setSavingPlan(false);
    }
  }

  async function saveResumen(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !rival) return;
    setSavingResumen(true);
    try {
      const payload = {
        name: rival.name,
        logoUrl: rival.logoUrl,
        coach: resumenForm.coach.trim() || null,
        baseSystem: resumenForm.baseSystem.trim() || null,
        nextMatchDate: resumenForm.nextMatchDate ? new Date(resumenForm.nextMatchDate).toISOString() : null,
        nextMatchCompetition: resumenForm.nextMatchCompetition.trim() || null,
      };
      const res = await fetch(`/api/ct/rivales/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadRival();
      setEditResumen(false);
    } catch (err: any) {
      alert(err?.message || "No se pudo guardar el resumen");
    } finally {
      setSavingResumen(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadRival(), loadPlan()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const headerInfo = useMemo(() => {
    if (!rival) return { dt: "—", sistema: "—", proximo: "—" };
    const dt = rival.coach || "—";
    const sistema = rival.baseSystem || "—";
    const proximo = rival.nextMatchDate
      ? new Date(rival.nextMatchDate).toLocaleDateString()
      : "—";
    const comp = rival.nextMatchCompetition ? ` (${rival.nextMatchCompetition})` : "";
    return { dt, sistema, proximo: proximo + comp };
  }, [rival]);

  if (loading) return <div className="p-4 text-gray-500">Cargando…</div>;

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

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-600">
        <Link href="/ct/rivales" className="underline">
          Rivales
        </Link>
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
            DT: <b>{headerInfo.dt}</b> • Sistema base: {headerInfo.sistema}
          </p>
          <p className="text-sm text-gray-600">Próximo partido: {headerInfo.proximo}</p>
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
              tab === (t.key as Tab)
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resumen</h2>
              {!editResumen ? (
                <button
                  className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
                  onClick={() => setEditResumen(true)}
                >
                  Editar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
                    onClick={() => {
                      // reset form a valores actuales
                      setResumenForm({
                        coach: rival.coach ?? "",
                        baseSystem: rival.baseSystem ?? "",
                        nextMatchDate: isoToDateInput(rival.nextMatchDate),
                        nextMatchCompetition: rival.nextMatchCompetition ?? "",
                      });
                      setEditResumen(false);
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {!editResumen ? (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-gray-500">Director técnico</div>
                  <div className="font-medium">{rival.coach || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Sistema base</div>
                  <div className="font-medium">{rival.baseSystem || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Próximo partido</div>
                  <div className="font-medium">
                    {rival.nextMatchDate
                      ? new Date(rival.nextMatchDate).toLocaleDateString()
                      : "—"}
                    {rival.nextMatchCompetition ? ` — ${rival.nextMatchCompetition}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={saveResumen} className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Director técnico</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder='p.ej. "Martín Demichelis"'
                    value={resumenForm.coach}
                    onChange={(e) => setResumenForm((f) => ({ ...f, coach: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Sistema base</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder='p.ej. "4-3-3"'
                    value={resumenForm.baseSystem}
                    onChange={(e) => setResumenForm((f) => ({ ...f, baseSystem: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Fecha próximo partido</label>
                  <input
                    type="date"
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={resumenForm.nextMatchDate}
                    onChange={(e) => setResumenForm((f) => ({ ...f, nextMatchDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Competición</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Liga Profesional, Copa…"
                    value={resumenForm.nextMatchCompetition}
                    onChange={(e) =>
                      setResumenForm((f) => ({ ...f, nextMatchCompetition: e.target.value }))
                    }
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingResumen}
                    className={`px-3 py-1.5 rounded-xl text-xs ${
                      savingResumen ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                    }`}
                  >
                    {savingResumen ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs border hover:bg-gray-50"
                    onClick={() => {
                      setResumenForm({
                        coach: rival.coach ?? "",
                        baseSystem: rival.baseSystem ?? "",
                        nextMatchDate: isoToDateInput(rival.nextMatchDate),
                        nextMatchCompetition: rival.nextMatchCompetition ?? "",
                      });
                      setEditResumen(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Plan de partido</h2>

            {/* Charla oficial (solo CT) */}
            <form onSubmit={savePlan} className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">
                  Charla oficial (solo CT)
                </div>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder="URL a PDF / PPT / Keynote (Drive, etc.)"
                  value={plan.charlaUrl ?? ""}
                  onChange={(e) =>
                    setPlan((p) => ({ ...p, charlaUrl: e.target.value.trim() || null }))
                  }
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Sube el archivo a tu drive y pega el enlace compartible (solo CT).
                </p>
              </div>

              {/* Informe visual (CT + jugadores) */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="text-xs font-semibold text-gray-500">Informe rival</div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Sistema</label>
                    <input
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      placeholder='p.ej. "4-3-3"'
                      value={plan.report.system ?? ""}
                      onChange={(e) =>
                        setPlan((p) => ({
                          ...p,
                          report: { ...p.report, system: e.target.value.trim() || null },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Jugadores clave (uno por línea)</label>
                    <textarea
                      className="w-full rounded-md border px-2 py-1.5 text-sm h-28"
                      placeholder={"#10 — Enganche\n#9 — Referente de área"}
                      value={arrToLines(plan.report.keyPlayers)}
                      onChange={(e) =>
                        setPlan((p) => ({
                          ...p,
                          report: { ...p.report, keyPlayers: linesToArr(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Fortalezas (una por línea)</label>
                    <textarea
                      className="w-full rounded-md border px-2 py-1.5 text-sm h-28"
                      placeholder={"Presión alta organizada\nTransiciones rápidas"}
                      value={arrToLines(plan.report.strengths)}
                      onChange={(e) =>
                        setPlan((p) => ({
                          ...p,
                          report: { ...p.report, strengths: linesToArr(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Debilidades (una por línea)</label>
                    <textarea
                      className="w-full rounded-md border px-2 py-1.5 text-sm h-28"
                      placeholder={"Laterales dejan espacio a la espalda\nSufren centros cruzados"}
                      value={arrToLines(plan.report.weaknesses)}
                      onChange={(e) =>
                        setPlan((p) => ({
                          ...p,
                          report: { ...p.report, weaknesses: linesToArr(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Balón parado a favor (una por línea)</label>
                    <textarea
                      className="w-full rounded-md border px-2 py-1.5 text-sm h-28"
                      placeholder={"Córners cerrados al 1er palo\nFaltas laterales — segunda jugada"}
                      value={arrToLines(plan.report.setPieces?.for)}
                      onChange={(e) =>
                        setPlan((p) => ({
                          ...p,
                          report: {
                            ...p.report,
                            setPieces: { ...(p.report.setPieces || {}), for: linesToArr(e.target.value) },
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Balón parado en contra (una por línea)</label>
                    <textarea
                      className="w-full rounded-md border px-2 py-1.5 text-sm h-28"
                      placeholder={"Marcan en zona — atacar segundo palo\nRápidos en contras post-córner"}
                      value={arrToLines(plan.report.setPieces?.against)}
                      onChange={(e) =>
                        setPlan((p) => ({
                          ...p,
                          report: {
                            ...p.report,
                            setPieces: { ...(p.report.setPieces || {}), against: linesToArr(e.target.value) },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingPlan}
                  className={`px-3 py-1.5 rounded-xl text-xs ${
                    savingPlan ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                  }`}
                >
                  {savingPlan ? "Guardando…" : "Guardar plan"}
                </button>
                {planLoading && <span className="text-xs text-gray-500">Cargando plan…</span>}
              </div>
            </form>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            <p className="text-sm text-gray-600">Clips del rival y nuestros enfrentamientos (próximamente).</p>
          </div>
        )}

        {tab === "stats" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
            <p className="text-sm text-gray-600">Últimos partidos, GF/GC, posesión (próximamente).</p>
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">Solo visible para CT: observaciones y checklist (próximamente).</p>
          </div>
        )}
      </section>
    </div>
  );
}
