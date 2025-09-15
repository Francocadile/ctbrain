// src/app/ct/rivales/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "resumen" | "plan" | "videos" | "stats" | "notas" | "visibilidad" | "importar";

// ==== Tipos compartidos con la API ====
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

type Visibility = {
  showSystem: boolean;
  showKeyPlayers: boolean;
  showStrengths: boolean;
  showWeaknesses: boolean;
  showSetPiecesFor: boolean;
  showSetPiecesAgainst: boolean;

  showCharlaUrl: boolean;

  showVideos: boolean;

  showStatsTotalsGF: boolean;
  showStatsTotalsGA: boolean;
  showStatsTotalsPossession: boolean;
  showStatsRecent: boolean;

  showNotesForPlayers: boolean;
};

function defaultVisibility(): Visibility {
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

// ==== Página ====
export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const initialTab = (search.get("tab") as Tab) || "resumen";

  // Tabs
  const [tab, setTab] = useState<Tab>(initialTab);
  function setURLTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  // CT / Player preview
  const [playerPreview, setPlayerPreview] = useState(false);

  // Basics
  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<RivalBasics | null>(null);

  // Plan (CT)
  const [planLoading, setPlanLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<RivalPlan>({
    charlaUrl: "",
    report: { system: "", strengths: [], weaknesses: [], keyPlayers: [], setPieces: { for: [], against: [] } },
  });

  // Edición de básicos (CT)
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

  // Notas
  const [notes, setNotes] = useState<RivalNotes>({ observations: "", checklist: [] });
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [newItem, setNewItem] = useState("");

  // Visibilidad (UI de toggles)
  const [vis, setVis] = useState<Visibility>(defaultVisibility());
  const [loadingVis, setLoadingVis] = useState(true);
  const [savingVis, setSavingVis] = useState(false);

  // Vista jugador (player-safe)
  const [playerDataLoading, setPlayerDataLoading] = useState(false);
  const [playerBasics, setPlayerBasics] = useState<RivalBasics | null>(null);
  const [playerPlan, setPlayerPlan] = useState<RivalPlan | null>(null);
  const [playerVideos, setPlayerVideos] = useState<RivalVideo[] | null>(null);
  const [playerStats, setPlayerStats] = useState<RivalStats | null>(null);
  const [playerNotes, setPlayerNotes] = useState<RivalNotes | null>(null);
  const [playerVis, setPlayerVis] = useState<Visibility | null>(null);

  // ===== IMPORTAR (PDF/CSV) =====
  const [importing, setImporting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // ===== Helpers =====
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

  // ===== Cargas =====
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
    setLoadingVis(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/visibility`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const data = (json?.data || defaultVisibility()) as Visibility;
      setVis({ ...defaultVisibility(), ...data });
    } finally {
      setLoadingVis(false);
    }
  }
  async function loadPlayerSafe() {
    setPlayerDataLoading(true);
    try {
      const res = await fetch(`/api/ct/rivales/${id}/player`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const data = json?.data || {};
      setPlayerBasics(data.basics ?? null);
      setPlayerPlan(data.plan ?? null);
      setPlayerVideos(Array.isArray(data.videos) ? data.videos : null);
      setPlayerStats(data.stats ?? null);
      setPlayerNotes(data.notes ?? null);
      setPlayerVis(data.visibility ?? null);
    } finally {
      setPlayerDataLoading(false);
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

  useEffect(() => {
    if (playerPreview) loadPlayerSafe();
  }, [playerPreview, id]);

  // ===== Saves (CT) =====
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
      if (playerPreview) await loadPlayerSafe();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSavingPlan(false);
    }
  }

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
      if (playerPreview) await loadPlayerSafe();
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
      if (playerPreview) await loadPlayerSafe();
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
      if (playerPreview) await loadPlayerSafe();
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
      if (playerPreview) await loadPlayerSafe();
    } catch (err: any) {
      alert(err?.message || "Error al guardar notas");
    } finally {
      setSavingNotes(false);
    }
  }

  // Visibilidad (guardar/patch + reset)
  function setVisKey<K extends keyof Visibility>(k: K, v: boolean) {
    setVis((prev) => ({ ...prev, [k]: v }));
  }
  async function saveVisPatch(patch: Partial<Visibility>) {
    setSavingVis(true);
    try {
      await fetch(`/api/ct/rivales/${id}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await loadVisibility();
      if (playerPreview) await loadPlayerSafe();
    } catch (e: any) {
      alert(e?.message || "Error al guardar visibilidad");
    } finally {
      setSavingVis(false);
    }
  }
  async function saveVisAll() {
    // enviamos TODAS las claves actuales (para forzar estado exacto)
    await saveVisPatch({ ...vis });
  }
  async function resetVisToDefaults() {
    const defs = defaultVisibility();
    setVis(defs);
    await saveVisPatch(defs);
  }

  // ===== Importar: handlers =====
  async function importPDF() {
    if (!pdfFile) { setImportMsg("Seleccioná un PDF primero."); return; }
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", pdfFile);
      const res = await fetch(`/api/ct/rivales/${id}/import/pdf`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      await Promise.all([loadBasics(), loadPlan(), loadStats()]);
      setImportMsg("PDF importado. Se actualizaron datos del plan y estadísticas (si se pudieron extraer).");
      if (playerPreview) await loadPlayerSafe();
    } catch (e: any) {
      setImportMsg(e?.message || "Error importando PDF");
    } finally {
      setImporting(false);
    }
  }

  async function importCSV() {
    if (!csvFile) { setImportMsg("Seleccioná un CSV primero."); return; }
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", csvFile);
      const res = await fetch(`/api/ct/rivales/${id}/import/csv`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      await loadStats();
      setImportMsg("CSV importado. Se actualizaron últimos partidos y totales.");
      if (playerPreview) await loadPlayerSafe();
    } catch (e: any) {
      setImportMsg(e?.message || "Error importando CSV");
    } finally {
      setImporting(false);
    }
  }

  // ===== Render =====
  if (loading) return <div className="p-4 text-gray-500">Cargando…</div>;
  if (!rival)
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-500">Rival no encontrado</div>
        <Link href="/ct/rivales" className="text-sm underline">← Volver a Rivales</Link>
      </div>
    );

  const basicsForHeader = playerPreview ? (playerBasics ?? rival) : rival;
  const nm = nextMatchLabel(basicsForHeader);
  const isCTView = !playerPreview;

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb + Vista jugador */}
      <div className="text-sm text-gray-600 flex items-center justify-between">
        <div>
          <Link href="/ct/rivales" className="underline">Rivales</Link>
          <span className="mx-1">/</span>
          <span className="font-medium">{basicsForHeader.name}</span>
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <span className="text-gray-600">Vista jugador</span>
          <input
            type="checkbox"
            checked={playerPreview}
            onChange={() => setPlayerPreview((v) => !v)}
            className="h-4 w-4"
          />
          {playerPreview && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              Previsualizando
            </span>
          )}
        </label>
      </div>

      {/* Header */}
      <header className="flex items-center gap-4 border-b pb-3">
        {basicsForHeader.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={basicsForHeader.logoUrl}
            alt={basicsForHeader.name}
            className="h-16 w-16 rounded border object-contain bg-white"
          />
        ) : (
          <div className="h-16 w-16 rounded border bg-gray-100" />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{basicsForHeader.name}</h1>
          <p className="text-sm text-gray-600">
            DT: <b>{basicsForHeader.coach || "—"}</b> • Sistema base: {basicsForHeader.baseSystem || "—"}
          </p>
          <p className="text-sm text-gray-600">Próximo partido: {nm}</p>
        </div>
        {isCTView && tab === "resumen" && (
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
          { key: "visibilidad", label: "Visibilidad" },
          { key: "importar", label: "Importar" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setURLTab(t.key as Tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              tab === (t.key as Tab) ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Contenido por tab */}
      <section className="rounded-xl border bg-white p-4">
        {/* RESUMEN */}
        {tab === "resumen" && (
          <>
            {!editingBasics || !isCTView ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Resumen</h2>
                <ul className="text-sm text-gray-700 list-disc pl-4">
                  <li>DT: {basicsForHeader.coach || "—"}</li>
                  <li>Sistema base: {basicsForHeader.baseSystem || "—"}</li>
                  <li>Próximo partido: {nm}</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  * Estos campos se pueden editar desde el listado de rivales (o más adelante desde esta ficha).
                </p>
              </div>
            ) : (
              <form onSubmit={saveBasics} className="space-y-4">
                <h2 className="text-lg font-semibold">Editar datos del rival</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">DT</label>
                    <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={coach} onChange={(e) => setCoach(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Sistema base</label>
                    <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={baseSystem} onChange={(e) => setBaseSystem(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Próximo partido (fecha y hora)</label>
                    <input type="datetime-local" className="w-full rounded-md border px-2 py-1.5 text-sm" value={nextMatch} onChange={(e) => setNextMatch(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Competición</label>
                    <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={nextComp} onChange={(e) => setNextComp(e.target.value)} />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={savingBasics}
                    className={`px-3 py-1.5 rounded-xl text-xs ${savingBasics ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                  >
                    {savingBasics ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* PLAN */}
        {tab === "plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan de partido</h2>
              {playerPreview && (
                <span className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                  Vista jugador (aplicando visibilidad)
                </span>
              )}
            </div>

            {playerPreview ? (
              playerDataLoading ? (
                <div className="text-gray-500 text-sm">Cargando…</div>
              ) : (
                <div className="space-y-3">
                  {/* Charla si está habilitada */}
                  {playerVis?.showCharlaUrl && playerPlan?.charlaUrl ? (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">Charla oficial</div>
                      <a href={playerPlan.charlaUrl} target="_blank" rel="noreferrer" className="text-sm underline">Abrir charla →</a>
                    </div>
                  ) : null}

                  <div className="grid md:grid-cols-2 gap-3">
                    {playerVis?.showSystem && (
                      <InfoBlock title="Sistema" content={playerPlan?.report.system || "—"} />
                    )}
                    {playerVis?.showKeyPlayers && (
                      <ListBlock title="Jugadores clave" items={playerPlan?.report.keyPlayers} />
                    )}
                    {playerVis?.showStrengths && (
                      <ListBlock title="Fortalezas" items={playerPlan?.report.strengths} />
                    )}
                    {playerVis?.showWeaknesses && (
                      <ListBlock title="Debilidades" items={playerPlan?.report.weaknesses} />
                    )}
                    {playerVis?.showSetPiecesFor && (
                      <ListBlock title="Balón parado (a favor)" items={playerPlan?.report.setPieces?.for} />
                    )}
                    {playerVis?.showSetPiecesAgainst && (
                      <ListBlock title="Balón parado (en contra)" items={playerPlan?.report.setPieces?.against} />
                    )}
                  </div>
                </div>
              )
            ) : (
              // Vista CT (edición)
              <form onSubmit={savePlan} className="space-y-4">
                {/* Charla */}
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
                    {plan.charlaUrl ? (
                      <div className="flex items-end">
                        <a href={plan.charlaUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                          Abrir charla en nueva pestaña →
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Informe visual */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                    Informe visual (visible para jugadores según visibilidad)
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Sistema</label>
                      <input
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder='Ej: "4-3-3"'
                        value={plan.report.system || ""}
                        onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, system: e.target.value } }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Jugadores clave (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Ej: Pérez 10&#10;Gómez 9"
                        value={arrayToLines(plan.report.keyPlayers)}
                        onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, keyPlayers: linesToArray(e.target.value) } }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Fortalezas (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Presión alta&#10;Transiciones rápidas"
                        value={arrayToLines(plan.report.strengths)}
                        onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, strengths: linesToArray(e.target.value) } }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Debilidades (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Lentitud en repliegue&#10;Laterales dejan espalda"
                        value={arrayToLines(plan.report.weaknesses)}
                        onChange={(e) => setPlan((p) => ({ ...p, report: { ...p.report, weaknesses: linesToArray(e.target.value) } }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Balón parado – A favor (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Córner cerrado primer palo&#10;Tiro libre directo"
                        value={arrayToLines(plan.report.setPieces?.for)}
                        onChange={(e) => setPlan((p) => ({
                          ...p, report: { ...p.report, setPieces: { for: linesToArray(e.target.value), against: p.report.setPieces?.against || [] } }
                        }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Balón parado – En contra (1 por línea)</label>
                      <textarea
                        className="w-full rounded-md border px-2 py-1.5 text-sm h-24"
                        placeholder="Córner segundos palos&#10;Saques de banda largos"
                        value={arrayToLines(plan.report.setPieces?.against)}
                        onChange={(e) => setPlan((p) => ({
                          ...p, report: { ...p.report, setPieces: { for: p.report.setPieces?.for || [], against: linesToArray(e.target.value) } }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingPlan}
                      className={`px-3 py-1.5 rounded-xl text-xs ${savingPlan ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                    >
                      {savingPlan ? "Guardando…" : "Guardar plan"}
                    </button>
                    {planLoading && <span className="ml-3 text-xs text-gray-500">Cargando plan…</span>}
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIDEOS */}
        {tab === "videos" && (
          <>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            {playerPreview ? (
              playerDataLoading ? (
                <div className="text-gray-500 text-sm">Cargando…</div>
              ) : (
                <div className="space-y-2">
                  {!playerVis?.showVideos && <div className="text-sm text-gray-500">No visible para jugadores.</div>}
                  {(playerVis?.showVideos && (playerVideos?.length || 0) > 0) ? (
                    <ul className="list-disc pl-4 text-sm">
                      {playerVideos!.map((v, i) => (
                        <li key={i}>
                          <a href={v.url} className="underline" target="_blank" rel="noreferrer">
                            {v.title || v.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : playerVis?.showVideos ? (
                    <div className="text-sm text-gray-500">Sin videos.</div>
                  ) : null}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    className="rounded-md border px-2 py-1 text-sm w-64"
                    placeholder="Título (opcional)"
                    value={newVidTitle}
                    onChange={(e) => setNewVidTitle(e.target.value)}
                  />
                <input
                    className="rounded-md border px-2 py-1 text-sm flex-1"
                    placeholder="URL del video"
                    value={newVidUrl}
                    onChange={(e) => setNewVidUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addVideoLocal()) : null}
                  />
                  <button onClick={addVideoLocal} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">+ Agregar</button>
                </div>

                {loadingVideos ? (
                  <div className="text-sm text-gray-500">Cargando…</div>
                ) : (
                  <ul className="space-y-2">
                    {(videos || []).length === 0 && <li className="text-sm text-gray-500">Sin videos.</li>}
                    {videos.map((v, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">
                          {v.title ? `${v.title} — ` : ""}{v.url}
                        </span>
                        <button onClick={() => removeVideoLocal(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-1">
                  <button
                    onClick={saveVideos}
                    disabled={savingVideos}
                    className={`px-3 py-1.5 rounded-xl text-xs ${savingVideos ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                  >
                    {savingVideos ? "Guardando…" : "Guardar videos"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* STATS */}
        {tab === "stats" && (
          <>
            <h2 className="text-lg font-semibold mb-3">Estadísticas</h2>
            {playerPreview ? (
              playerDataLoading ? (
                <div className="text-sm text-gray-500">Cargando…</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox label="GF" value={playerStats?.totals?.gf} hidden={!playerVis?.showStatsTotalsGF} />
                    <StatBox label="GC" value={playerStats?.totals?.ga} hidden={!playerVis?.showStatsTotalsGA} />
                    <StatBox label="% Posesión" value={playerStats?.totals?.possession} hidden={!playerVis?.showStatsTotalsPossession} />
                  </div>

                  {playerVis?.showStatsRecent ? (
                    <div className="rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">Fecha</th>
                            <th className="text-left p-2">Rival</th>
                            <th className="text-left p-2">Comp</th>
                            <th className="text-left p-2">Loc</th>
                            <th className="text-right p-2">GF</th>
                            <th className="text-right p-2">GC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(playerStats?.recent || []).length === 0 && (
                            <tr><td colSpan={6} className="p-2 text-gray-500">Sin datos.</td></tr>
                          )}
                          {(playerStats?.recent || []).map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{r.date || "—"}</td>
                              <td className="p-2">{r.opponent || "—"}</td>
                              <td className="p-2">{r.comp || "—"}</td>
                              <td className="p-2">{r.homeAway || "—"}</td>
                              <td className="p-2 text-right">{Number.isFinite(r.gf as number) ? r.gf : "—"}</td>
                              <td className="p-2 text-right">{Number.isFinite(r.ga as number) ? r.ga : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Últimos partidos ocultos para jugadores.</div>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-4">
                {/* Totales */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">GF</label>
                    <input
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      type="number"
                      value={stats.totals?.gf ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...(s.totals || {}), gf: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">GA</label>
                    <input
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      type="number"
                      value={stats.totals?.ga ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...(s.totals || {}), ga: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">% Posesión</label>
                    <input
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      type="number"
                      value={stats.totals?.possession ?? ""}
                      onChange={(e) => setStats((s) => ({ ...s, totals: { ...(s.totals || {}), possession: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                    />
                  </div>
                </div>

                {/* Últimos partidos */}
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between p-2">
                    <div className="text-[12px] font-semibold uppercase tracking-wide">Últimos partidos</div>
                    <button onClick={addRecentRow} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">
                      + Agregar fila
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Fecha (ISO o texto)</th>
                        <th className="text-left p-2">Rival</th>
                        <th className="text-left p-2">Comp</th>
                        <th className="text-left p-2">Loc</th>
                        <th className="text-right p-2">GF</th>
                        <th className="text-right p-2">GC</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent || []).length === 0 && (
                        <tr><td colSpan={7} className="p-2 text-gray-500">Sin filas.</td></tr>
                      )}
                      {(stats.recent || []).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1">
                            <input className="w-full rounded-md border px-2 py-1" value={r.date ?? ""} onChange={(e) => updateRecentRow(i, { date: e.target.value })} />
                          </td>
                          <td className="p-1">
                            <input className="w-full rounded-md border px-2 py-1" value={r.opponent ?? ""} onChange={(e) => updateRecentRow(i, { opponent: e.target.value })} />
                          </td>
                          <td className="p-1">
                            <input className="w-full rounded-md border px-2 py-1" value={r.comp ?? ""} onChange={(e) => updateRecentRow(i, { comp: e.target.value })} />
                          </td>
                          <td className="p-1">
                            <input className="w-full rounded-md border px-2 py-1" value={r.homeAway ?? ""} onChange={(e) => updateRecentRow(i, { homeAway: e.target.value })} placeholder="H/A/N" />
                          </td>
                          <td className="p-1">
                            <input className="w-full rounded-md border px-2 py-1 text-right" type="number" value={r.gf ?? ""} onChange={(e) => updateRecentRow(i, { gf: e.target.value === "" ? undefined : Number(e.target.value) })} />
                          </td>
                          <td className="p-1">
                            <input className="w-full rounded-md border px-2 py-1 text-right" type="number" value={r.ga ?? ""} onChange={(e) => updateRecentRow(i, { ga: e.target.value === "" ? undefined : Number(e.target.value) })} />
                          </td>
                          <td className="p-1">
                            <button onClick={() => removeRecentRow(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-1">
                  <button
                    onClick={saveStats}
                    disabled={savingStats}
                    className={`px-3 py-1.5 rounded-xl text-xs ${savingStats ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                  >
                    {savingStats ? "Guardando…" : "Guardar estadísticas"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* NOTAS */}
        {tab === "notas" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Notas internas</h2>
            {playerPreview ? (
              playerDataLoading ? (
                <div className="text-sm text-gray-500">Cargando…</div>
              ) : playerVis?.showNotesForPlayers ? (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3 bg-gray-50">
                    <div className="text-[12px] font-semibold uppercase tracking-wide">Observaciones</div>
                    <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
                      {playerNotes?.observations || "—"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-[12px] font-semibold uppercase tracking-wide">Checklist</div>
                    <ul className="mt-2 space-y-1">
                      {(playerNotes?.checklist || []).length === 0 && <li className="text-sm text-gray-500">Sin ítems.</li>}
                      {(playerNotes?.checklist || []).map((it, i) => (
                        <li key={i} className="text-sm">
                          {it.done ? "✅ " : "⬜ "} {it.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No visible para jugadores.</div>
              )
            ) : (
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
                      className={`px-3 py-1.5 rounded-xl text-xs ${savingNotes ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                    >
                      {savingNotes ? "Guardando…" : "Guardar notas"}
                    </button>
                    {loadingNotes && <span className="ml-3 text-xs text-gray-500">Cargando…</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* VISIBILIDAD */}
        {tab === "visibilidad" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Visibilidad (qué ven los jugadores)</h2>
              <div className="flex gap-2">
                <button
                  onClick={resetVisToDefaults}
                  disabled={savingVis}
                  className="text-xs px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                  title="Restaurar valores predeterminados"
                >
                  Restaurar
                </button>
                <button
                  onClick={saveVisAll}
                  disabled={savingVis}
                  className={`text-xs px-3 py-1.5 rounded-xl ${savingVis ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                >
                  {savingVis ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>

            {loadingVis ? (
              <div className="text-sm text-gray-500">Cargando…</div>
            ) : (
              <>
                {/* Plan */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Plan de partido</div>
                  <Toggle label="Sistema" checked={vis.showSystem} onChange={(v) => setVisKey("showSystem", v)} />
                  <Toggle label="Jugadores clave" checked={vis.showKeyPlayers} onChange={(v) => setVisKey("showKeyPlayers", v)} />
                  <Toggle label="Fortalezas" checked={vis.showStrengths} onChange={(v) => setVisKey("showStrengths", v)} />
                  <Toggle label="Debilidades" checked={vis.showWeaknesses} onChange={(v) => setVisKey("showWeaknesses", v)} />
                  <Toggle label="Balón parado – A favor" checked={vis.showSetPiecesFor} onChange={(v) => setVisKey("showSetPiecesFor", v)} />
                  <Toggle label="Balón parado – En contra" checked={vis.showSetPiecesAgainst} onChange={(v) => setVisKey("showSetPiecesAgainst", v)} />
                </div>

                {/* Charla */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Charla oficial</div>
                  <Toggle label="Mostrar enlace de charla a jugadores" checked={vis.showCharlaUrl} onChange={(v) => setVisKey("showCharlaUrl", v)} />
                </div>

                {/* Videos */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Videos</div>
                  <Toggle label="Mostrar lista de videos" checked={vis.showVideos} onChange={(v) => setVisKey("showVideos", v)} />
                </div>

                {/* Stats */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Estadísticas</div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <Toggle label="GF (goles a favor)" checked={vis.showStatsTotalsGF} onChange={(v) => setVisKey("showStatsTotalsGF", v)} />
                    <Toggle label="GC (goles en contra)" checked={vis.showStatsTotalsGA} onChange={(v) => setVisKey("showStatsTotalsGA", v)} />
                    <Toggle label="% de posesión" checked={vis.showStatsTotalsPossession} onChange={(v) => setVisKey("showStatsTotalsPossession", v)} />
                    <Toggle label="Últimos partidos" checked={vis.showStatsRecent} onChange={(v) => setVisKey("showStatsRecent", v)} />
                  </div>
                </div>

                {/* Notas */}
                <div className="rounded-lg border p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Notas internas</div>
                  <Toggle label="Permitir ver notas a jugadores" checked={vis.showNotesForPlayers} onChange={(v) => setVisKey("showNotesForPlayers", v)} />
                </div>

                <div className="pt-2">
                  <button
                    onClick={saveVisAll}
                    disabled={savingVis}
                    className={`px-3 py-1.5 rounded-xl text-xs ${savingVis ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                  >
                    {savingVis ? "Guardando…" : "Guardar cambios"}
                  </button>
                  <span className="ml-3 text-xs text-gray-500">Tip: activá “Vista jugador” arriba para previsualizar.</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== IMPORTAR ===== */}
        {tab === "importar" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Importar datos (Wyscout PDF / CSV)</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* PDF */}
              <div className="rounded-lg border p-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">PDF de informe de equipo</div>
                <p className="text-sm text-gray-600 mb-2">
                  Subí el PDF de Wyscout (informe de equipo). Intentaremos extraer DT, sistema base, jugadores clave, fortalezas/debilidades y algunos totales.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
                <div className="pt-2">
                  <button
                    onClick={importPDF}
                    disabled={importing || !pdfFile}
                    className={`px-3 py-1.5 rounded-xl text-xs ${importing || !pdfFile ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                  >
                    {importing ? "Procesando…" : "Importar PDF"}
                  </button>
                </div>
              </div>

              {/* CSV */}
              <div className="rounded-lg border p-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">CSV de resultados/estadística</div>
                <p className="text-sm text-gray-600 mb-2">
                  Subí un CSV con columnas típicas (date, opponent, comp, homeAway, gf, ga, possession).  
                  Se actualizarán “Últimos partidos” y los totales (GF/GA/Posesión).
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
                <div className="pt-2">
                  <button
                    onClick={importCSV}
                    disabled={importing || !csvFile}
                    className={`px-3 py-1.5 rounded-xl text-xs ${importing || !csvFile ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
                  >
                    {importing ? "Procesando…" : "Importar CSV"}
                  </button>
                </div>
              </div>
            </div>

            {importMsg && (
              <div className="text-sm px-3 py-2 rounded-md border bg-gray-50">{importMsg}</div>
            )}

            <div className="text-xs text-gray-500">
              Nota: El parseo es heurístico. Si algún dato no sale perfecto, podés corregirlo a mano en las pestañas “Plan” y “Estadísticas”.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// === Componentes auxiliares ===
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

function StatBox({ label, value, hidden }: { label: string; value?: number; hidden?: boolean }) {
  if (hidden) return null;
  const show = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="rounded-lg border p-3 bg-gray-50">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{show ? value : "—"}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-800">{label}</span>
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
