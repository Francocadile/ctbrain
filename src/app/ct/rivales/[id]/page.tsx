// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas";

// === Tipos API ===
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

type NoteItem = { text: string; done?: boolean };
type RivalNotes = { observations?: string; checklist?: NoteItem[] };

// === Visibilidad ===
type VisibilitySettings = {
  showSystem?: boolean;
  showKeyPlayers?: boolean;
  showStrengths?: boolean;
  showWeaknesses?: boolean;
  showSetPiecesFor?: boolean;
  showSetPiecesAgainst?: boolean;

  showCharlaUrl?: boolean;

  showVideos?: boolean;

  showStatsTotalsGF?: boolean;
  showStatsTotalsGA?: boolean;
  showStatsTotalsPossession?: boolean;
  showStatsRecent?: boolean;

  showNotesForPlayers?: boolean;
};

function defaultVisibility(): Required<VisibilitySettings> {
  return {
    showSystem: true,
    showKeyPlayers: true,
    showStrengths: true,
    showWeaknesses: true,
    showSetPiecesFor: true,
    showSetPiecesAgainst: true,

    showCharlaUrl: false,

    showVideos: true,

    showStatsTotalsGF: true,
    showStatsTotalsGA: true,
    showStatsTotalsPossession: true,
    showStatsRecent: true,

    showNotesForPlayers: false,
  };
}

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const initialTab = (search.get("tab") as Tab) || "resumen";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<RivalBasics | null>(null);

  // Toggle para simular rol (cuando integremos auth real se reemplaza)
  const isCT = true;

  // --- Plan
  const [planLoading, setPlanLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<RivalPlan>({
    charlaUrl: "",
    report: { system: "", strengths: [], weaknesses: [], keyPlayers: [], setPieces: { for: [], against: [] } },
  });

  // --- Resumen (edición básica)
  const [editingBasics, setEditingBasics] = useState(false);
  const [savingBasics, setSavingBasics] = useState(false);
  const [coach, setCoach] = useState("");
  const [baseSystem, setBaseSystem] = useState("");
  const [nextMatch, setNextMatch] = useState<string>("");
  const [nextComp, setNextComp] = useState("");

  // --- Videos
  const [videos, setVideos] = useState<RivalVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [savingVideos, setSavingVideos] = useState(false);
  const [newVidTitle, setNewVidTitle] = useState("");
  const [newVidUrl, setNewVidUrl] = useState("");

  // --- Stats
  const [stats, setStats] = useState<RivalStats>({ totals: { gf: undefined, ga: undefined, possession: undefined }, recent: [] });
  const [loadingStats, setLoadingStats] = useState(true);
  const [savingStats, setSavingStats] = useState(false);

  // --- Notas
  const [notes, setNotes] = useState<RivalNotes>({ observations: "", checklist: [] });
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [newItem, setNewItem] = useState("");

  // --- Visibilidad (solo CT)
  const [vis, setVis] = useState<Required<VisibilitySettings>>(defaultVisibility());
  const [visLoading, setVisLoading] = useState(true);
  const [savingVis, setSavingVis] = useState(false);

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

  // -------- LOADERS --------
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
        totals: { gf: data.totals?.gf, ga: data.totals?.ga, possession: data.totals?.possession },
        recent: Array.isArray(data.recent) ? data.recent : [],
      });
    } finally {
      setLoadingStats(false);
    }
  }
  async function loadNotes() {
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/notas`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const data = (json?.data || {}) as RivalNotes;
      setNotes({
        observations: data.observations ?? "",
        checklist: Array.isArray(data.checklist) ? data.checklist : [],
      });
    } finally {
      setLoadingNotes(false);
    }
  }
  async function loadVisibility() {
    setVisLoading(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/visibility`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const data = (json?.data || {}) as VisibilitySettings;
      setVis({ ...defaultVisibility(), ...data });
    } finally {
      setVisLoading(false);
    }
  }

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setPlanLoading(true);
    try {
      await Promise.all([loadBasics(), loadPlan(), loadVideos(), loadStats(), loadNotes(), loadVisibility()]);
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

  // -------- LABELS --------
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

  // -------- SAVE HANDLERS --------
  async function savePlanHandler(e: React.FormEvent) {
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

  async function saveBasicsHandler(e: React.FormEvent) {
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
        totals: { gf: stats.totals?.gf ?? undefined, ga: stats.totals?.ga ?? undefined, possession: stats.totals?.possession ?? undefined },
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

  // Notas
  function toggleItem(i: number) {
    setNotes((n) => {
      const arr = [...(n.checklist || [])];
      arr[i] = { ...arr[i], done: !arr[i].done };
      return { ...n, checklist: arr };
    });
  }
  function updateItem(i: number, text: string) {
    setNotes((n) => {
      const arr = [...(n.checklist || [])];
      arr[i] = { ...arr[i], text };
      return { ...n, checklist: arr };
    });
  }
  function removeItem(i: number) {
    setNotes((n) => ({ ...n, checklist: (n.checklist || []).filter((_, idx) => idx !== i) }));
  }
  function addItem() {
    const t = newItem.trim();
    if (!t) return;
    setNotes((n) => ({ ...n, checklist: [{ text: t, done: false }, ...(n.checklist || [])] }));
    setNewItem("");
  }
  async function saveNotes() {
    setSavingNotes(true);
    try {
      const payload: RivalNotes = {
        observations: (notes.observations || "").trim(),
        checklist: (notes.checklist || []).map((it) => ({ text: it.text.trim(), done: !!it.done })),
      };
      const res = await fetch(`/api/ct/rivales/${id}/notas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar notas");
      await loadNotes();
    } catch (err: any) {
      alert(err?.message || "Error al guardar notas");
    } finally {
      setSavingNotes(false);
    }
  }

  // Visibilidad
  async function saveVisibility() {
    setSavingVis(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vis), // mandamos el estado completo
      });
      if (!res.ok) throw new Error("No se pudo guardar visibilidad");
      await loadVisibility();
    } catch (err: any) {
      alert(err?.message || "Error al guardar visibilidad");
    } finally {
      setSavingVis(false);
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
              tab === t.key ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Contenido */}
      <section className="rounded-xl border bg-white p-4">
        {/* RESUMEN */}
        {tab === "resumen" && (
          <div className="space-y-4">
            {!editingBasics ? (
              <>
                <h2 className="text-lg font-semibold">Resumen</h2>
                <ul className="text-sm text-gray-700 list-disc pl-4">
                  <li>DT: {rival.coach || "—"}</li>
                  <li>Sistema base: {rival.baseSystem || "—"}</li>
                  <li>Próximo partido: {nm}</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  * Estos campos se pueden editar desde aquí (solo CT).
                </p>
              </>
            ) : (
              <form onSubmit={saveBasicsHandler} className="space-y-3">
                <h2 className="text-lg font-semibold">Editar datos básicos</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-gray-500">DT</label>
                    <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={coach} onChange={(e) => setCoach(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-500">Sistema base</label>
                    <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={baseSystem} onChange={(e) => setBaseSystem(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-500">Próximo partido (fecha y hora)</label>
                    <input type="datetime-local" className="w-full rounded-md border px-2 py-1.5 text-sm" value={nextMatch} onChange={(e) => setNextMatch(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-500">Competencia</label>
                    <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={nextComp} onChange={(e) => setNextComp(e.target.value)} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingBasics}
                  className={`px-3 py-1.5 rounded-xl text-xs ${savingBasics ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                >
                  {savingBasics ? "Guardando…" : "Guardar"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* PLAN */}
        {tab === "plan" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan de partido</h2>
              {!isCT && (
                <span className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                  Vista jugador
                </span>
              )}
            </div>

            {/* Panel de visibilidad (solo CT) */}
            {isCT && (
              <div className="rounded-lg border p-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                  Visibilidad para jugadores
                </div>

                {visLoading ? (
                  <div className="text-xs text-gray-500">Cargando visibilidad…</div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-2">
                      <SwitchRow label="Sistema" checked={vis.showSystem} onChange={(v) => setVis((s) => ({ ...s, showSystem: v }))} />
                      <SwitchRow label="Jugadores clave" checked={vis.showKeyPlayers} onChange={(v) => setVis((s) => ({ ...s, showKeyPlayers: v }))} />
                      <SwitchRow label="Fortalezas" checked={vis.showStrengths} onChange={(v) => setVis((s) => ({ ...s, showStrengths: v }))} />
                      <SwitchRow label="Debilidades" checked={vis.showWeaknesses} onChange={(v) => setVis((s) => ({ ...s, showWeaknesses: v }))} />
                      <SwitchRow label="Balón parado: a favor" checked={vis.showSetPiecesFor} onChange={(v) => setVis((s) => ({ ...s, showSetPiecesFor: v }))} />
                      <SwitchRow label="Balón parado: en contra" checked={vis.showSetPiecesAgainst} onChange={(v) => setVis((s) => ({ ...s, showSetPiecesAgainst: v }))} />
                      <SwitchRow label="Mostrar link de Charla" checked={vis.showCharlaUrl} onChange={(v) => setVis((s) => ({ ...s, showCharlaUrl: v }))} />
                      <SwitchRow label="Videos" checked={vis.showVideos} onChange={(v) => setVis((s) => ({ ...s, showVideos: v }))} />
                      <SwitchRow label="Stats: GF totales" checked={vis.showStatsTotalsGF} onChange={(v) => setVis((s) => ({ ...s, showStatsTotalsGF: v }))} />
                      <SwitchRow label="Stats: GA totales" checked={vis.showStatsTotalsGA} onChange={(v) => setVis((s) => ({ ...s, showStatsTotalsGA: v }))} />
                      <SwitchRow label="Stats: Posesión" checked={vis.showStatsTotalsPossession} onChange={(v) => setVis((s) => ({ ...s, showStatsTotalsPossession: v }))} />
                      <SwitchRow label="Stats: Últimos partidos" checked={vis.showStatsRecent} onChange={(v) => setVis((s) => ({ ...s, showStatsRecent: v }))} />
                      <SwitchRow label="Permitir ver Notas internas" checked={vis.showNotesForPlayers} onChange={(v) => setVis((s) => ({ ...s, showNotesForPlayers: v }))} />
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={saveVisibility}
                        disabled={savingVis}
                        className={`px-3 py-1.5 rounded-xl text-xs ${
                          savingVis ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                        }`}
                      >
                        {savingVis ? "Guardando…" : "Guardar visibilidad"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Charla + Informe (edición CT) */}
            {isCT ? (
              <form onSubmit={savePlanHandler} className="space-y-4">
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
                        onChange={(e) => setPlan((p) => ({ ...p, charlaUrl: e.target.value }))}
                      />
                      <p className="text-[11px] text-gray-500">Pegá el enlace compartible (Drive, Dropbox, etc.). Opcional.</p>
                    </div>
                    {plan.charlaUrl && vis.showCharlaUrl ? (
                      <div className="flex items-end">
                        <a href={plan.charlaUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                          Abrir charla en nueva pestaña →
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                    Informe visual (visible para jugadores según switches)
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Sistema */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Sistema</label>
                      <input
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder='Ej: "4-3-3"'
                        value={plan.report.system || ""}
                        onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, system: e.target.value } }))}
                      />
                    </div>

                    {/* Jugadores clave */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Jugadores clave (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Ej: Pérez 10&#10;Gómez 9"
                        value={arrayToLines(plan.report.keyPlayers)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: { ...p.report, keyPlayers: linesToArray(e.target.value) },
                          }))
                        }
                      />
                    </div>

                    {/* Fortalezas */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Fortalezas (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Presión alta&#10;Transiciones rápidas"
                        value={arrayToLines(plan.report.strengths)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: { ...p.report, strengths: linesToArray(e.target.value) },
                          }))
                        }
                      />
                    </div>

                    {/* Debilidades */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Debilidades (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Lentitud en repliegue&#10;Laterales dejan espalda"
                        value={arrayToLines(plan.report.weaknesses)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: { ...p.report, weaknesses: linesToArray(e.target.value) },
                          }))
                        }
                      />
                    </div>

                    {/* BP a favor */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Balón parado – A favor (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Córner cerrado primer palo&#10;Tiro libre directo"
                        value={arrayToLines(plan.report.setPieces?.for)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              setPieces: { for: linesToArray(e.target.value), against: p.report.setPieces?.against || [] },
                            },
                          }))
                        }
                      />
                    </div>

                    {/* BP en contra */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Balón parado – En contra (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Córner segundos palos&#10;Saques de banda largos"
                        value={arrayToLines(plan.report.setPieces?.against)}
                        onChange={(e) =>
                          setPlan((p) => ({
                            ...p,
                            report: {
                              ...p.report,
                              setPieces: { for: p.report.setPieces?.for || [], against: linesToArray(e.target.value) },
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
                        savingPlan ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                      }`}
                    >
                      {savingPlan ? "Guardando…" : "Guardar plan"}
                    </button>
                    {planLoading && <span className="ml-3 text-xs text-gray-500">Cargando plan…</span>}
                  </div>
                </div>
              </form>
            ) : (
              // Vista jugador (respeta visibilidad)
              <div className="space-y-3">
                {vis.showCharlaUrl && plan.charlaUrl ? (
                  <div className="rounded-lg border p-3">
                    <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">Charla</div>
                    <a href={plan.charlaUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                      Abrir charla →
                    </a>
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-3">
                  {vis.showSystem && <InfoBlock title="Sistema" content={plan.report.system || "—"} />}
                  {vis.showKeyPlayers && <ListBlock title="Jugadores clave" items={plan.report.keyPlayers} />}
                  {vis.showStrengths && <ListBlock title="Fortalezas" items={plan.report.strengths} />}
                  {vis.showWeaknesses && <ListBlock title="Debilidades" items={plan.report.weaknesses} />}
                  {vis.showSetPiecesFor && <ListBlock title="Balón parado (a favor)" items={plan.report.setPieces?.for} />}
                  {vis.showSetPiecesAgainst && <ListBlock title="Balón parado (en contra)" items={plan.report.setPieces?.against} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIDEOS */}
        {tab === "videos" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Videos</h2>
            {!isCT && !vis.showVideos ? (
              <div className="text-sm text-gray-500">El CT ocultó esta sección para jugadores.</div>
            ) : (
              <>
                {isCT && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="grid md:grid-cols-2 gap-2">
                      <input
                        className="rounded-md border px-2 py-1 text-sm"
                        placeholder="Título (opcional)"
                        value={newVidTitle}
                        onChange={(e) => setNewVidTitle(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-md border px-2 py-1 text-sm"
                          placeholder="URL del video (YouTube, Drive, etc.)"
                          value={newVidUrl}
                          onChange={(e) => setNewVidUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addVideoLocal()) : null}
                        />
                        <button onClick={addVideoLocal} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">+ Agregar</button>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={saveVideos}
                        disabled={savingVideos}
                        className={`px-3 py-1.5 rounded-xl text-xs ${
                          savingVideos ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                        }`}
                      >
                        {savingVideos ? "Guardando…" : "Guardar lista"}
                      </button>
                      {loadingVideos && <span className="ml-3 text-xs text-gray-500">Cargando…</span>}
                    </div>
                  </div>
                )}

                <ul className="divide-y">
                  {videos.length === 0 ? (
                    <li className="py-3 text-sm text-gray-500">Sin videos cargados.</li>
                  ) : (
                    videos.map((v, i) => (
                      <li key={i} className="py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{v.title || "(Sin título)"}</div>
                          <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all">
                            {v.url}
                          </a>
                        </div>
                        {isCT && (
                          <button onClick={() => removeVideoLocal(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">
                            Borrar
                          </button>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        )}

        {/* STATS */}
        {tab === "stats" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Estadísticas</h2>

            {!isCT && (
              <>
                <div className="rounded-lg border p-3 grid sm:grid-cols-3 gap-3">
                  {vis.showStatsTotalsGF && (
                    <InfoBlock title="Goles a favor (totales)" content={stats.totals?.gf != null ? String(stats.totals.gf) : "—"} />
                  )}
                  {vis.showStatsTotalsGA && (
                    <InfoBlock title="Goles en contra (totales)" content={stats.totals?.ga != null ? String(stats.totals.ga) : "—"} />
                  )}
                  {vis.showStatsTotalsPossession && (
                    <InfoBlock title="Posesión promedio" content={stats.totals?.possession != null ? `${stats.totals.possession}%` : "—"} />
                  )}
                </div>

                {vis.showStatsRecent ? (
                  <div className="rounded-lg border p-3">
                    <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Últimos partidos</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-gray-500">
                          <tr>
                            <th className="py-1 pr-3">Fecha</th>
                            <th className="py-1 pr-3">Rival</th>
                            <th className="py-1 pr-3">Comp.</th>
                            <th className="py-1 pr-3">Loc.</th>
                            <th className="py-1 pr-3">GF</th>
                            <th className="py-1 pr-3">GA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stats.recent || []).length === 0 ? (
                            <tr><td colSpan={6} className="py-2 text-gray-500">Sin datos.</td></tr>
                          ) : (
                            (stats.recent || []).map((r, i) => (
                              <tr key={i} className="border-t">
                                <td className="py-1 pr-3">{r.date || "—"}</td>
                                <td className="py-1 pr-3">{r.opponent || "—"}</td>
                                <td className="py-1 pr-3">{r.comp || "—"}</td>
                                <td className="py-1 pr-3">{r.homeAway || "—"}</td>
                                <td className="py-1 pr-3">{r.gf != null ? r.gf : "—"}</td>
                                <td className="py-1 pr-3">{r.ga != null ? r.ga : "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">El CT ocultó los últimos partidos.</div>
                )}
              </>
            )}

            {isCT && (
              <>
                <div className="rounded-lg border p-3 grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500">Goles a favor (totales)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={stats.totals?.gf ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...s.totals, gf: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Goles en contra (totales)</label>
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
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={stats.totals?.possession ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...s.totals, possession: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold uppercase tracking-wide">Últimos partidos</div>
                    <button onClick={addRecentRow} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">+ Agregar fila</button>
                  </div>

                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-500">
                        <tr>
                          <th className="py-1 pr-3">Fecha (ISO)</th>
                          <th className="py-1 pr-3">Rival</th>
                          <th className="py-1 pr-3">Comp.</th>
                          <th className="py-1 pr-3">Loc. (H/A/N)</th>
                          <th className="py-1 pr-3">GF</th>
                          <th className="py-1 pr-3">GA</th>
                          <th className="py-1 pr-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stats.recent || []).length === 0 ? (
                          <tr><td colSpan={7} className="py-2 text-gray-500">Sin filas.</td></tr>
                        ) : (
                          (stats.recent || []).map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1 pr-3">
                                <input className="w-full rounded-md border px-2 py-1 text-sm"
                                  value={r.date || ""} onChange={(e) => updateRecentRow(i, { date: e.target.value })} />
                              </td>
                              <td className="py-1 pr-3">
                                <input className="w-full rounded-md border px-2 py-1 text-sm"
                                  value={r.opponent || ""} onChange={(e) => updateRecentRow(i, { opponent: e.target.value })} />
                              </td>
                              <td className="py-1 pr-3">
                                <input className="w-full rounded-md border px-2 py-1 text-sm"
                                  value={r.comp || ""} onChange={(e) => updateRecentRow(i, { comp: e.target.value })} />
                              </td>
                              <td className="py-1 pr-3">
                                <input className="w-20 rounded-md border px-2 py-1 text-sm"
                                  value={r.homeAway || ""} onChange={(e) => updateRecentRow(i, { homeAway: e.target.value.toUpperCase() })} />
                              </td>
                              <td className="py-1 pr-3">
                                <input type="number" className="w-20 rounded-md border px-2 py-1 text-sm"
                                  value={r.gf ?? ""} onChange={(e) => updateRecentRow(i, { gf: e.target.value === "" ? undefined : Number(e.target.value) })} />
                              </td>
                              <td className="py-1 pr-3">
                                <input type="number" className="w-20 rounded-md border px-2 py-1 text-sm"
                                  value={r.ga ?? ""} onChange={(e) => updateRecentRow(i, { ga: e.target.value === "" ? undefined : Number(e.target.value) })} />
                              </td>
                              <td className="py-1 pr-3">
                                <button onClick={() => removeRecentRow(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={saveStats}
                      disabled={savingStats}
                      className={`px-3 py-1.5 rounded-xl text-xs ${
                        savingStats ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                      }`}
                    >
                      {savingStats ? "Guardando…" : "Guardar estadísticas"}
                    </button>
                    {loadingStats && <span className="ml-3 text-xs text-gray-500">Cargando…</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* NOTAS */}
        {tab === "notas" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Notas internas</h2>

            {!isCT && !vis.showNotesForPlayers ? (
              <div className="text-sm text-gray-500">El CT ocultó esta sección para jugadores.</div>
            ) : isCT ? (
              <>
                <div className="rounded-lg border p-3 bg-gray-50">
                  <label className="text-[12px] font-semibold uppercase tracking-wide">Observaciones</label>
                  <textarea
                    className="w-full rounded-md border px-2 py-1.5 text-sm h-28 mt-1 bg-white"
                    placeholder="Ideas, alertas, instrucciones internas…"
                    value={notes.observations || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, observations: e.target.value }))}
                  />
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold uppercase tracking-wide">Checklist</div>
                    <div className="flex gap-2">
                      <input
                        className="rounded-md border px-2 py-1 text-sm w-64"
                        placeholder="Nuevo ítem…"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addItem()) : null}
                      />
                      <button onClick={addItem} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">+ Agregar</button>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {(notes.checklist || []).length === 0 && (
                      <li className="text-sm text-gray-500">Sin ítems.</li>
                    )}
                    {(notes.checklist || []).map((it, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input type="checkbox" checked={!!it.done} onChange={() => toggleItem(i)} />
                        <input
                          className={`flex-1 rounded-md border px-2 py-1 text-sm ${it.done ? "line-through text-gray-500" : ""}`}
                          value={it.text}
                          onChange={(e) => updateItem(i, e.target.value)}
                        />
                        <button onClick={() => removeItem(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3">
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className={`px-3 py-1.5 rounded-xl text-xs ${
                        savingNotes ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                      }`}
                    >
                      {savingNotes ? "Guardando…" : "Guardar notas"}
                    </button>
                    {loadingNotes && <span className="ml-3 text-xs text-gray-500">Cargando…</span>}
                  </div>
                </div>
              </>
            ) : (
              // Vista jugador con notas (si el CT habilitó verlo)
              <div className="space-y-3">
                <InfoBlock title="Observaciones" content={notes.observations || "—"} />
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">Checklist</div>
                  {(notes.checklist || []).length ? (
                    <ul className="list-disc pl-4 text-sm text-gray-800 space-y-0.5">
                      {(notes.checklist || []).map((it, i) => <li key={i}>{it.text}</li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">—</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ——— Componentes pequeños ———
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
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">—</div>
      )}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
