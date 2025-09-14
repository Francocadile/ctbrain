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

// Notas
type NoteItem = { text: string; done?: boolean };
type RivalNotes = { observations?: string; checklist?: NoteItem[] };

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const initialTab = (search.get("tab") as Tab) || "resumen";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<RivalBasics | null>(null);

  const isCT = true; // TODO auth real

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

  // Notas
  const [notes, setNotes] = useState<RivalNotes>({ observations: "", checklist: [] });
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [newItem, setNewItem] = useState("");

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

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setPlanLoading(true);
    try {
      await Promise.all([loadBasics(), loadPlan(), loadVideos(), loadStats(), loadNotes()]);
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
        {/* RESUMEN / PLAN / VIDEOS / STATS igual que antes … */}

        {tab === "notas" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Notas internas (solo CT)</h2>

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
          </div>
        )}
      </section>
    </div>
  );
}
