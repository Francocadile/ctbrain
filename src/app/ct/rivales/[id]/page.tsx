// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

type RivalBasics = {
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

type RivalPlan = { charlaUrl: string | null; report: RivalReport };

type RivalVideo = { title?: string | null; url: string };

type RecentRow = {
  date?: string;
  opponent?: string;
  comp?: string;
  homeAway?: string; // H/A/N
  gf?: number;
  ga?: number;
};

type RivalStats = {
  totals?: { gf?: number; ga?: number; possession?: number };
  recent?: RecentRow[];
};

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const initialTab = (search.get("tab") as Tab) || "resumen";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<RivalBasics | null>(null);

  // CT (placeholder)
  const isCT = true;

  // Plan
  const [planLoading, setPlanLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<RivalPlan>({
    charlaUrl: "",
    report: { system: "", strengths: [], weaknesses: [], keyPlayers: [], setPieces: { for: [], against: [] } },
  });

  // Resumen edit
  const [editingBasics, setEditingBasics] = useState(false);
  const [savingBasics, setSavingBasics] = useState(false);
  const [coach, setCoach] = useState("");
  const [baseSystem, setBaseSystem] = useState("");
  const [nextMatch, setNextMatch] = useState<string>("");
  const [nextComp, setNextComp] = useState("");

  // Videos
  const [videos, setVideos] = useState<RivalVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [savingVideos, setSavingVideos] = useState(false);
  const [newVidTitle, setNewVidTitle] = useState("");
  const [newVidUrl, setNewVidUrl] = useState("");

  // Stats
  const [stats, setStats] = useState<RivalStats>({ totals: { gf: undefined, ga: undefined, possession: undefined }, recent: [] });
  const [loadingStats, setLoadingStats] = useState(true);
  const [savingStats, setSavingStats] = useState(false);

  function setURLTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  function linesToArray(s: string): string[] {
    return s.split("\n").map((x) => x.trim()).filter(Boolean);
  }
  function arrayToLines(a?: string[]): string {
    return (a || []).join("\n");
  }

  // datetime-local helpers
  function isoToLocalInput(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function localInputToIso(localVal?: string) {
    if (!localVal) return null;
    const d = new Date(localVal);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function loadBasics() {
    const res = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("rival not found");
    const json = await res.json();
    const rb = json?.data as RivalBasics;
    setRival(rb);
    setCoach(rb.coach || "");
    setBaseSystem(rb.baseSystem || "");
    setNextMatch(isoToLocalInput(rb.nextMatchDate));
    setNextComp(rb.nextMatchCompetition || "");
  }

  async function loadPlan() {
    const res = await fetch(`/api/ct/rivales/${id}/plan`, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    const data = (json?.data || {}) as RivalPlan;
    setPlan({
      charlaUrl: data.charlaUrl ?? "",
      report: {
        system: data.report?.system ?? "",
        strengths: data.report?.strengths ?? [],
        weaknesses: data.report?.weaknesses ?? [],
        keyPlayers: data.report?.keyPlayers ?? [],
        setPieces: { for: data.report?.setPieces?.for ?? [], against: data.report?.setPieces?.against ?? [] },
      },
    });
  }

  async function loadVideos() {
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/videos`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setVideos(Array.isArray(json?.data) ? json.data : []);
    } finally {
      setLoadingVideos(false);
    }
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/stats`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const data = (json?.data || {}) as RivalStats;
      setStats({
        totals: {
          gf: data.totals?.gf,
          ga: data.totals?.ga,
          possession: data.totals?.possession,
        },
        recent: Array.isArray(data.recent) ? data.recent : [],
      });
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setPlanLoading(true);
    try {
      await Promise.all([loadBasics(), loadPlan(), loadVideos(), loadStats()]);
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

  function nextMatchLabel(r?: RivalBasics | null) {
    if (!r?.nextMatchDate) return "—";
    try {
      const d = new Date(r.nextMatchDate);
      const fmt = d.toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      return `${fmt}${r.nextMatchCompetition ? ` • ${r.nextMatchCompetition}` : ""}`;
    } catch {
      return "—";
    }
  }

  // Save plan
  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const payload: RivalPlan = {
        charlaUrl: plan.charlaUrl?.trim() || null,
        report: {
          system: plan.report.system?.trim() || null,
          strengths: plan.report.strengths || [],
          weaknesses: plan.report.weaknesses || [],
          keyPlayers: plan.report.keyPlayers || [],
          setPieces: { for: plan.report.setPieces?.for || [], against: plan.report.setPieces?.against || [] },
        },
      };
      const res = await fetch(`/api/ct/rivales/${id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar el plan");
      await loadPlan();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSavingPlan(false);
    }
  }

  // Save basics
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
      setRival(json?.data as RivalBasics);
      setEditingBasics(false);
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSavingBasics(false);
    }
  }

  // Videos
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
      const res = await fetch(`/api/ct/rivales/${id}/videos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });
      if (!res.ok) throw new Error("No se pudo guardar videos");
      await loadVideos();
    } catch (err: any) {
      alert(err?.message || "Error al guardar videos");
    } finally {
      setSavingVideos(false);
    }
  }

  // Stats
  function addRecentRow() {
    setStats((s) => ({ ...s, recent: [{}, ...(s.recent || [])] }));
  }
  function updateRecentRow(i: number, patch: Partial<RecentRow>) {
    setStats((s) => {
      const arr = [...(s.recent || [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...s, recent: arr };
    });
  }
  function removeRecentRow(i: number) {
    setStats((s) => ({ ...s, recent: (s.recent || []).filter((_, idx) => idx !== i) }));
  }
  async function saveStats() {
    setSavingStats(true);
    try {
      const payload: RivalStats = {
        totals: {
          gf: stats.totals?.gf ?? undefined,
          ga: stats.totals?.ga ?? undefined,
          possession: stats.totals?.possession ?? undefined,
        },
        recent: stats.recent || [],
      };
      const res = await fetch(`/api/ct/rivales/${id}/stats`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar estadísticas");
      await loadStats();
    } catch (err: any) {
      alert(err?.message || "Error al guardar estadísticas");
    } finally {
      setSavingStats(false);
    }
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando…</div>;
  if (!rival)
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-500">Rival no encontrado</div>
        <Link href="/ct/rivales" className="text-sm underline">← Volver a Rivales</Link>
      </div>
    );

  const nm = nextMatchLabel(rival);

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-gray-600">
        <Link href="/ct/rivales" className="underline">Rivales</Link>
        <span className="mx-1">/</span>
        <span className="font-medium">{rival.name}</span>
      </div>

      <header className="flex items-center gap-4 border-b pb-3">
        {rival.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rival.logoUrl} alt={rival.name} className="h-16 w-16 rounded border object-contain bg-white" />
        ) : (
          <div className="h-16 w-16 rounded border bg-gray-100" />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{rival.name}</h1>
          <p className="text-sm text-gray-600">DT: <b>{rival.coach || "—"}</b> • Sistema base: {rival.baseSystem || "—"}</p>
          <p className="text-sm text-gray-600">Próximo partido: {nm}</p>
        </div>
        {isCT && tab === "resumen" && (
          <button onClick={() => setEditingBasics((v) => !v)} className="text-xs px-3 py-1.5 rounded-xl border hover:bg-gray-50">
            {editingBasics ? "Cancelar" : "Editar"}
          </button>
        )}
      </header>

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
              tab === t.key ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="rounded-xl border bg-white p-4">
        {tab === "resumen" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Resumen</h2>
            {!editingBasics ? (
              <>
                <ul className="text-sm text-gray-700 list-disc pl-4">
                  <li>DT: {rival.coach || "—"}</li>
                  <li>Sistema base: {rival.baseSystem || "—"}</li>
                  <li>Próximo partido: {nm}</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">* Estos campos se pueden editar desde aquí (solo CT).</p>
              </>
            ) : (
              <form onSubmit={saveBasics} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Director Técnico</label>
                  <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={coach} onChange={(e) => setCoach(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Sistema base</label>
                  <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={baseSystem} onChange={(e) => setBaseSystem(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Próximo partido</label>
                  <input type="datetime-local" className="w-full rounded-md border px-2 py-1.5 text-sm" value={nextMatch} onChange={(e) => setNextMatch(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">Competición</label>
                  <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={nextComp} onChange={(e) => setNextComp(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" disabled={savingBasics} className={`px-3 py-1.5 rounded-xl text-xs ${savingBasics ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}>
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
              {!isCT && <span className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800">Vista jugador</span>}
            </div>

            {isCT && (
              <form onSubmit={savePlan} className="space-y-4">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Charla oficial (URL)</div>
                  <input className="w-full rounded-md border px-2 py-1.5 text-sm" placeholder="https://…" value={plan.charlaUrl || ""} onChange={(e) => setPlan((p) => ({ ...p, charlaUrl: e.target.value }))} />
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Informe visual</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Sistema</label>
                      <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={plan.report.system || ""} onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, system: e.target.value } }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Jugadores clave (1 por línea)</label>
                      <textarea className="w-full rounded-md border px-2 py-1.5 text-sm h-24" value={arrayToLines(plan.report.keyPlayers)} onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, keyPlayers: linesToArray(e.target.value) } }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Fortalezas (1 por línea)</label>
                      <textarea className="w-full rounded-md border px-2 py-1.5 text-sm h-24" value={arrayToLines(plan.report.strengths)} onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, strengths: linesToArray(e.target.value) } }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Debilidades (1 por línea)</label>
                      <textarea className="w-full rounded-md border px-2 py-1.5 text-sm h-24" value={arrayToLines(plan.report.weaknesses)} onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, weaknesses: linesToArray(e.target.value) } }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Balón parado – A favor</label>
                      <textarea className="w-full rounded-md border px-2 py-1.5 text-sm h-24" value={arrayToLines(plan.report.setPieces?.for)} onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, setPieces: { for: linesToArray(e.target.value), against: p.report.setPieces?.against || [] } } }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Balón parado – En contra</label>
                      <textarea className="w-full rounded-md border px-2 py-1.5 text-sm h-24" value={arrayToLines(plan.report.setPieces?.against)} onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, setPieces: { for: p.report.setPieces?.for || [], against: linesToArray(e.target.value) } } }))} />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={savingPlan} className={`px-3 py-1.5 rounded-xl text-xs ${savingPlan ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}>
                      {savingPlan ? "Guardando…" : "Guardar plan"}
                    </button>
                    {planLoading && <span className="ml-3 text-xs text-gray-500">Cargando plan…</span>}
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
                <div className="grid md:grid-cols-3 gap-2">
                  <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="Título (opcional)" value={newVidTitle} onChange={(e) => setNewVidTitle(e.target.value)} />
                  <input className="rounded-md border px-2 py-1.5 text-sm md:col-span-2" placeholder="https://…" value={newVidUrl} onChange={(e) => setNewVidUrl(e.target.value)} />
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <button onClick={addVideoLocal} className="px-3 py-1.5 rounded-xl text-xs bg-black text-white hover:opacity-90">Añadir a la lista</button>
                  <button onClick={saveVideos} disabled={savingVideos} className={`px-3 py-1.5 rounded-xl text-xs ${savingVideos ? "bg-gray-200 text-gray-500" : "bg-emerald-600 text-white hover:opacity-90"}`}>
                    {savingVideos ? "Guardando…" : "Guardar cambios"}
                  </button>
                  {loadingVideos && <span className="text-xs text-gray-500">Cargando…</span>}
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
                    <tr><td className="px-3 py-3 text-gray-500" colSpan={3}>No hay videos cargados.</td></tr>
                  ) : (
                    videos.map((v, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{v.title || "—"}</td>
                        <td className="px-3 py-2"><a href={v.url} target="_blank" rel="noreferrer" className="underline">{v.url}</a></td>
                        {isCT && (
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => removeVideoLocal(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Estadísticas</h2>

            {isCT && (
              <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500">Goles a favor (GF)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={stats.totals?.gf ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...s.totals, gf: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Goles en contra (GA)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={stats.totals?.ga ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...s.totals, ga: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Posesión promedio (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={stats.totals?.possession ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...s.totals, possession: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold uppercase tracking-wide">Últimos partidos</div>
                  <button onClick={addRecentRow} className="text-xs px-2 py-1 rounded-md border hover:bg-white">+ Agregar fila</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-2 py-1 text-left">Fecha</th>
                        <th className="px-2 py-1 text-left">Rival</th>
                        <th className="px-2 py-1 text-left">Comp.</th>
                        <th className="px-2 py-1 text-left">H/A</th>
                        <th className="px-2 py-1 text-left">GF</th>
                        <th className="px-2 py-1 text-left">GA</th>
                        <th className="px-2 py-1 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent || []).length === 0 ? (
                        <tr><td className="px-3 py-3 text-gray-500" colSpan={7}>Sin datos.</td></tr>
                      ) : (
                        (stats.recent || []).map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1">
                              <input type="date" className="rounded-md border px-2 py-1 text-sm w-40" value={r.date ? r.date.slice(0,10) : ""} onChange={(e) => updateRecentRow(i, { date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                            </td>
                            <td className="px-2 py-1">
                              <input className="rounded-md border px-2 py-1 text-sm w-48" value={r.opponent || ""} onChange={(e) => updateRecentRow(i, { opponent: e.target.value })} />
                            </td>
                            <td className="px-2 py-1">
                              <input className="rounded-md border px-2 py-1 text-sm w-40" value={r.comp || ""} onChange={(e) => updateRecentRow(i, { comp: e.target.value })} />
                            </td>
                            <td className="px-2 py-1">
                              <select className="rounded-md border px-2 py-1 text-sm" value={r.homeAway || ""} onChange={(e) => updateRecentRow(i, { homeAway: e.target.value as any })}>
                                <option value="">—</option>
                                <option value="H">H</option>
                                <option value="A">A</option>
                                <option value="N">N</option>
                              </select>
                            </td>
                            <td className="px-2 py-1">
                              <input type="number" className="rounded-md border px-2 py-1 text-sm w-20" value={typeof r.gf === "number" ? r.gf : ""} onChange={(e) => updateRecentRow(i, { gf: e.target.value === "" ? undefined : Number(e.target.value) })} />
                            </td>
                            <td className="px-2 py-1">
                              <input type="number" className="rounded-md border px-2 py-1 text-sm w-20" value={typeof r.ga === "number" ? r.ga : ""} onChange={(e) => updateRecentRow(i, { ga: e.target.value === "" ? undefined : Number(e.target.value) })} />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <button onClick={() => removeRecentRow(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-1">
                  <button onClick={saveStats} disabled={savingStats} className={`px-3 py-1.5 rounded-xl text-xs ${savingStats ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}>
                    {savingStats ? "Guardando…" : "Guardar estadísticas"}
                  </button>
                  {loadingStats && <span className="ml-3 text-xs text-gray-500">Cargando…</span>}
                </div>
              </div>
            )}

            {!isCT && (
              <div className="space-y-3">
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">Totales</div>
                  <div className="text-sm text-gray-800">
                    GF: {stats.totals?.gf ?? "—"} • GA: {stats.totals?.ga ?? "—"} • Posesión: {stats.totals?.possession ?? "—"}%
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Últimos partidos</div>
                  <ul className="text-sm text-gray-800 space-y-1">
                    {(stats.recent || []).map((r, i) => (
                      <li key={i}>
                        {r.date ? new Date(r.date).toLocaleDateString() : "—"} · {r.opponent || "—"} ({r.comp || "—"}) — {typeof r.gf === "number" ? r.gf : "—"}:{typeof r.ga === "number" ? r.ga : "—"} {r.homeAway ? `(${r.homeAway})` : ""}
                      </li>
                    ))}
                    {(stats.recent || []).length === 0 && <li className="text-gray-500">Sin datos.</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">Solo visible para CT: observaciones y checklist. (Próximo paso)</p>
          </div>
        )}
      </section>
    </div>
  );
}
