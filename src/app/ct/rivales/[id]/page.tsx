// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

type RivalVideo = { title?: string | null; url: string };

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

  // ——— Edición de básicos (Resumen) ———
  const [editingBasics, setEditingBasics] = useState(false);
  const [savingBasics, setSavingBasics] = useState(false);
  const [coach, setCoach] = useState("");
  const [baseSystem, setBaseSystem] = useState("");
  const [nextMatch, setNextMatch] = useState<string>(""); // datetime-local value
  const [nextComp, setNextComp] = useState("");

  // ——— Videos ———
  const [videos, setVideos] = useState<RivalVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [savingVideos, setSavingVideos] = useState(false);
  const [newVidTitle, setNewVidTitle] = useState("");
  const [newVidUrl, setNewVidUrl] = useState("");

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

  // datetime-local helpers
  function isoToLocalInput(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  }
  function localInputToIso(localVal?: string): string | null {
    if (!localVal) return null;
    const d = new Date(localVal);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function loadBasics() {
    const res = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("rival not found");
    const json = await res.json();
    const rb = json?.data as RivalBasics;
    setRival(rb);

    // precargar edición
    setCoach(rb.coach || "");
    setBaseSystem(rb.baseSystem || "");
    setNextMatch(isoToLocalInput(rb.nextMatchDate));
    setNextComp(rb.nextMatchCompetition || "");
  }

  async function loadPlan() {
    const res = await fetch(`/api/ct/rivales/${id}/plan`, { cache: "no-store" });
    if (!res.ok) {
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

  async function loadVideos() {
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/videos`, { cache: "no-store" });
      if (!res.ok) {
        setVideos([]);
        return;
      }
      const json = await res.json();
      setVideos(Array.isArray(json?.data) ? json.data : []);
    } finally {
      setLoadingVideos(false);
    }
  }

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setPlanLoading(true);
    try {
      await Promise.all([loadBasics(), loadPlan(), loadVideos()]);
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

  function getNextMatchLabel(r?: RivalBasics | null) {
    if (!r?.nextMatchDate) return "—";
    try {
      const d = new Date(r.nextMatchDate);
      const fmt = d.toLocaleString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${fmt}${r.nextMatchCompetition ? ` • ${r.nextMatchCompetition}` : ""}`;
    } catch {
      return "—";
    }
  }

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

  // Guardar básicos (Resumen)
  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    if (!rival) return;
    setSavingBasics(true);
    try {
      const payload = {
        name: rival.name,
        logoUrl: rival.logoUrl ?? null,
        coach: coach.trim() || null,
        baseSystem: baseSystem.trim() || null,
        nextMatchDate: localInputToIso(nextMatch),
        nextMatchCompetition: nextComp.trim() || null,
      };
      const res = await fetch(`/api/ct/rivales/${rival.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar los datos");
      const json = await res.json();
      const data = json?.data as RivalBasics;
      setRival(data);
      setCoach(data.coach || "");
      setBaseSystem(data.baseSystem || "");
      setNextMatch(isoToLocalInput(data.nextMatchDate));
      setNextComp(data.nextMatchCompetition || "");
      setEditingBasics(false);
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSavingBasics(false);
    }
  }

  // Videos: helpers
  function addVideoLocal() {
    const url = newVidUrl.trim();
    if (!url) return;
    setVideos((v) => [{ title: newVidTitle.trim() || null, url }, ...v]);
    setNewVidTitle("");
    setNewVidUrl("");
  }
  function removeVideoLocal(idx: number) {
    setVideos((v) => v.filter((_, i) => i !== idx));
  }
  async function saveVideos() {
    setSavingVideos(true);
    try {
      const payload = { videos };
      const res = await fetch(`/api/ct/rivales/${id}/videos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar videos");
      const json = await res.json();
      setVideos(Array.isArray(json?.data) ? json.data : []);
    } catch (err: any) {
      alert(err?.message || "Error al guardar videos");
    } finally {
      setSavingVideos(false);
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

  const nextMatchLabel = getNextMatchLabel(rival);

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
        <div className="flex-1">
          <h1 className="text-xl font-bold">{rival.name}</h1>
          <p className="text-sm text-gray-600">
            DT: <b>{rival.coach || "—"}</b> • Sistema base: {rival.baseSystem || "—"}
          </p>
          <p className="text-sm text-gray-600">Próximo partido: {nextMatchLabel}</p>
        </div>

        {isCT && tab === "resumen" && (
          <button
            onClick={() => setEditingBasics((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-xl border hover:bg-gray-50"
          >
            {editingBasics ? "Cancelar" : "Editar"}
          </button>
        )}
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
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Resumen</h2>

            {!editingBasics ? (
              <>
                <ul className="text-sm text-gray-700 list-disc pl-4">
                  <li>DT: {rival.coach || "—"}</li>
                  <li>Sistema base: {rival.baseSystem || "—"}</li>
                  <li>Próximo partido: {nextMatchLabel}</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  * Estos campos se pueden editar desde aquí (solo CT).
                </p>
              </>
            ) : (
              <form onSubmit={saveBasics} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Director Técnico</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={coach}
                    onChange={(e) => setCoach(e.target.value)}
                    placeholder="Ej: Martín Demichelis"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Sistema base</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={baseSystem}
                    onChange={(e) => setBaseSystem(e.target.value)}
                    placeholder='Ej: "4-3-3"'
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Próximo partido (fecha y hora)</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={nextMatch}
                    onChange={(e) => setNextMatch(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Competición / Torneo</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={nextComp}
                    onChange={(e) => setNextComp(e.target.value)}
                    placeholder="Liga Profesional, Copa, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={savingBasics}
                    className={`px-3 py-1.5 rounded-xl text-xs ${
                      savingBasics
                        ? "bg-gray-200 text-gray-500"
                        : "bg-black text-white hover:opacity-90"
                    }`}
                  >
                    {savingBasics ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            )}
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

                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                    Informe visual (visible para jugadores)
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
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
          </div>
        )}

        {tab === "videos" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Videos</h2>

            {isCT && (
              <div className="rounded-lg border p-3 bg-gray-50">
                <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                  Agregar enlace (YouTube, Drive, Vimeo, etc.)
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <input
                    className="rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Título (opcional)"
                    value={newVidTitle}
                    onChange={(e) => setNewVidTitle(e.target.value)}
                  />
                  <input
                    className="rounded-md border px-2 py-1.5 text-sm md:col-span-2"
                    placeholder="https://…"
                    value={newVidUrl}
                    onChange={(e) => setNewVidUrl(e.target.value)}
                  />
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={addVideoLocal}
                    className="px-3 py-1.5 rounded-xl text-xs bg-black text-white hover:opacity-90"
                  >
                    Añadir a la lista
                  </button>
                  <button
                    onClick={saveVideos}
                    disabled={savingVideos}
                    className={`px-3 py-1.5 rounded-xl text-xs ${
                      savingVideos
                        ? "bg-gray-200 text-gray-500"
                        : "bg-emerald-600 text-white hover:opacity-90"
                    }`}
                  >
                    {savingVideos ? "Guardando…" : "Guardar cambios"}
                  </button>
                  {loadingVideos && (
                    <span className="text-xs text-gray-500">Cargando…</span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Título</th>
                    <th className="text-left px-3 py-2">URL</th>
                    {isCT && <th className="px-3 py-2 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {videos.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={3}>
                        No hay videos cargados.
                      </td>
                    </tr>
                  ) : (
                    videos.map((v, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{v.title || "—"}</td>
                        <td className="px-3 py-2">
                          <a href={v.url} target="_blank" rel="noreferrer" className="underline">
                            {v.url}
                          </a>
                        </td>
                        {isCT && (
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => removeVideoLocal(i)}
                              className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
                            >
                              Borrar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500">
              * En el futuro podemos embeber los players (YouTube, Drive) directamente acá.
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
