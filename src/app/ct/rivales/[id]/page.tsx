// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

// === Tipos que devuelve nuestra API ===
type RivalBasics = {
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
  const [rival, setRival] = useState<RivalBasics | null>(null);

  // ——— Plan (solo CT) ———
  const isCT = true; // TODO: integrar con auth real
  const [planLoading, setPlanLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<RivalPlan>(() => ({
    charlaUrl: "",
    report: {
      system: "",
      strengths: [],
      weaknesses: [],
      keyPlayers: [],
      setPieces: { for: [], against: [] },
    },
  }));

  // Helpers
  function setURLTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  function linesToArray(s: string): string[] {
    return s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  function arrayToLines(a?: string[]): string {
    return (a || []).join("\n");
  }

  async function loadBasics() {
    const res = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("rival not found");
    const json = await res.json();
    setRival(json?.data as RivalBasics);
  }

  async function loadPlan() {
    const res = await fetch(`/api/ct/rivales/${id}/plan`, { cache: "no-store" });
    if (!res.ok) {
      // si aún no existe, mantenemos defaults
      setPlan({
        charlaUrl: "",
        report: {
          system: "",
          strengths: [],
          weaknesses: [],
          keyPlayers: [],
          setPieces: { for: [], against: [] },
        },
      });
      return;
    }
    const json = await res.json();
    const data = (json?.data || {}) as RivalPlan;
    setPlan({
      charlaUrl: data.charlaUrl ?? "",
      report: {
        system: data.report?.system ?? "",
        strengths: data.report?.strengths ?? [],
        weaknesses: data.report?.weaknesses ?? [],
        keyPlayers: data.report?.keyPlayers ?? [],
        setPieces: {
          for: data.report?.setPieces?.for ?? [],
          against: data.report?.setPieces?.against ?? [],
        },
      },
    });
  }

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setPlanLoading(true);
    try {
      await Promise.all([loadBasics(), loadPlan()]);
    } catch (e) {
      console.error(e);
      setRival(null);
    } finally {
      setLoading(false);
      setPlanLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Guardar plan
  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const payload: RivalPlan = {
        charlaUrl: plan.charlaUrl?.trim() ? plan.charlaUrl.trim() : null,
        report: {
          system: plan.report.system?.trim() ? plan.report.system.trim() : null,
          strengths: plan.report.strengths || [],
          weaknesses: plan.report.weaknesses || [],
          keyPlayers: plan.report.keyPlayers || [],
          setPieces: {
            for: plan.report.setPieces?.for || [],
            against: plan.report.setPieces?.against || [],
          },
        },
      };

      const res = await fetch(`/api/ct/rivales/${id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar el plan");

      const json = await res.json();
      const data = (json?.data || {}) as RivalPlan;
      setPlan({
        charlaUrl: data.charlaUrl ?? "",
        report: {
          system: data.report?.system ?? "",
          strengths: data.report?.strengths ?? [],
          weaknesses: data.report?.weaknesses ?? [],
          keyPlayers: data.report?.keyPlayers ?? [],
          setPieces: {
            for: data.report?.setPieces?.for ?? [],
            against: data.report?.setPieces?.against ?? [],
          },
        },
      });
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSavingPlan(false);
    }
  }

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

  const nextMatchLabel = useMemo(() => {
    if (!rival.nextMatchDate) return "—";
    try {
      const d = new Date(rival.nextMatchDate);
      const fmt = d.toLocaleString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${fmt}${rival.nextMatchCompetition ? ` • ${rival.nextMatchCompetition}` : ""}`;
    } catch {
      return "—";
    }
  }, [rival.nextMatchDate, rival.nextMatchCompetition]);

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
          <p className="text-sm text-gray-600">Próximo partido: {nextMatchLabel}</p>
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
            onClick={() => setURLTab(t.key as Tab)}
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
            <ul className="text-sm text-gray-700 list-disc pl-4">
              <li>DT: {rival.coach || "—"}</li>
              <li>Sistema base: {rival.baseSystem || "—"}</li>
              <li>Próximo partido: {nextMatchLabel}</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              * Estos campos se pueden editar desde el listado de rivales (o
              más adelante desde esta ficha).
            </p>
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan de partido</h2>
              {!isCT && (
                <span className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                  Vista jugador (solo Informe)
                </span>
              )}
            </div>

            {/* Charla oficial (solo CT) */}
            {isCT && (
              <form onSubmit={savePlan} className="space-y-4">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                    Charla oficial (PDF/PPT/Keynote) – Solo CT
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">URL del archivo</label>
                      <input
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder="https://drive.google.com/…"
                        value={plan.charlaUrl || ""}
                        onChange={(e) =>
                          setPlan((p) => ({ ...p, charlaUrl: e.target.value }))
                        }
                      />
                      <p className="text-[11px] text-gray-500">
                        Pegá el enlace compartible (Drive, Dropbox, etc.). Opcional.
                      </p>
                    </div>
                    {plan.charlaUrl ? (
                      <div className="flex items-end">
                        <a
                          href={plan.charlaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline"
                        >
                          Abrir charla en nueva pestaña →
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Informe visual (CT + jugadores) */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                    Informe visual (visible para jugadores)
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Sistema */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Sistema</label>
                      <input
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder='Ej: "4-3-3"'
                        value={plan.report.system || ""}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: { ...p.report, system: e.target.value },
                          }))
                        }
                      />
                    </div>

                    {/* Jugadores clave */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">
                        Jugadores clave (1 por línea)
                      </label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Ej: Pérez 10&#10;Gómez 9"
                        value={arrayToLines(plan.report.keyPlayers)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              keyPlayers: linesToArray(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Fortalezas */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">
                        Fortalezas (1 por línea)
                      </label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Presión alta&#10;Transiciones rápidas"
                        value={arrayToLines(plan.report.strengths)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              strengths: linesToArray(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Debilidades */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">
                        Debilidades (1 por línea)
                      </label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Lentitud en repliegue&#10;Laterales dejan espalda"
                        value={arrayToLines(plan.report.weaknesses)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              weaknesses: linesToArray(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Balón parado a favor */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">
                        Balón parado – A favor (1 por línea)
                      </label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Córner cerrado primer palo&#10;Tiro libre directo"
                        value={arrayToLines(plan.report.setPieces?.for)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              setPieces: {
                                for: linesToArray(e.target.value),
                                against: p.report.setPieces?.against || [],
                              },
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Balón parado en contra */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">
                        Balón parado – En contra (1 por línea)
                      </label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Córner segundos palos&#10;Saques de banda largos"
                        value={arrayToLines(plan.report.setPieces?.against)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              setPieces: {
                                for: p.report.setPieces?.for || [],
                                against: linesToArray(e.target.value),
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingPlan}
                      className={`px-3 py-1.5 rounded-xl text-xs ${
                        savingPlan
                          ? "bg-gray-200 text-gray-500"
                          : "bg-black text-white hover:opacity-90"
                      }`}
                    >
                      {savingPlan ? "Guardando…" : "Guardar plan"}
                    </button>
                    {planLoading && (
                      <span className="ml-3 text-xs text-gray-500">Cargando plan…</span>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* Vista jugador (si no es CT): solo render del informe */}
            {!isCT && (
              <div className="space-y-3">
                {planLoading ? (
                  <div className="text-gray-500 text-sm">Cargando…</div>
                ) : (
                  <>
                    {plan.charlaUrl ? null : null}
                    <div className="grid md:grid-cols-2 gap-3">
                      <InfoBlock title="Sistema" content={plan.report.system || "—"} />
                      <ListBlock title="Jugadores clave" items={plan.report.keyPlayers} />
                      <ListBlock title="Fortalezas" items={plan.report.strengths} />
                      <ListBlock title="Debilidades" items={plan.report.weaknesses} />
                      <ListBlock title="Balón parado (a favor)" items={plan.report.setPieces?.for} />
                      <ListBlock title="Balón parado (en contra)" items={plan.report.setPieces?.against} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "videos" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            <p className="text-sm text-gray-600">
              Clips del rival y nuestros enfrentamientos. (Próximo paso)
            </p>
          </div>
        )}

        {tab === "stats" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
            <p className="text-sm text-gray-600">
              Últimos partidos, GF/GC, posesión, etc. (Próximo paso)
            </p>
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">
              Solo visible para CT: observaciones y checklist. (Próximo paso)
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ——— Componentes pequeños para vista jugador ———
function InfoBlock({ title, content }: { title: string; content?: string | null }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">{title}</div>
      <div className="text-sm text-gray-800">{content || "—"}</div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">{title}</div>
      {items && items.length ? (
        <ul className="list-disc pl-4 text-sm text-gray-800 space-y-0.5">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">—</div>
      )}
    </div>
  );
}
