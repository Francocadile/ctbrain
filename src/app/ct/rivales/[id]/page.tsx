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
  nextMatchDate?: string | null;        // ISO string
  nextMatchCompetition?: string | null;
};

export default function RivalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const initialTab = (search.get("tab") as Tab) || "resumen";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [rival, setRival] = useState<Rival | null>(null);

  // ---- helpers ----
  const dateForInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const prettyDate = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
      if (!res.ok) throw new Error("not ok");
      const json = await res.json();
      setRival(json.data as Rival); // ⚠️ la API devuelve { data }
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

  // ----- estado de edición (solo en RESUMEN) -----
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Pick<
    Rival,
    "coach" | "baseSystem" | "nextMatchDate" | "nextMatchCompetition"
  > | null>(null);

  useEffect(() => {
    if (!rival) return;
    setForm({
      coach: rival.coach ?? "",
      baseSystem: rival.baseSystem ?? "",
      nextMatchDate: dateForInput(rival.nextMatchDate),
      nextMatchCompetition: rival.nextMatchCompetition ?? "",
    });
  }, [rival]);

  const resumenDirty = useMemo(() => {
    if (!rival || !form) return false;
    return (
      (form.coach ?? "") !== (rival.coach ?? "") ||
      (form.baseSystem ?? "") !== (rival.baseSystem ?? "") ||
      (form.nextMatchDate ?? "") !== dateForInput(rival.nextMatchDate) ||
      (form.nextMatchCompetition ?? "") !== (rival.nextMatchCompetition ?? "")
    );
  }, [rival, form]);

  async function handleSaveResumen(e: React.FormEvent) {
    e.preventDefault();
    if (!rival || !form) return;
    setSaving(true);
    try {
      const payload = {
        name: rival.name, // requerido por el PUT
        logoUrl: rival.logoUrl,
        coach: (form.coach || "").trim() || null,
        baseSystem: (form.baseSystem || "").trim() || null,
        nextMatchDate: form.nextMatchDate ? new Date(form.nextMatchDate).toISOString() : null,
        nextMatchCompetition: (form.nextMatchCompetition || "").trim() || null,
      };

      const res = await fetch(`/api/ct/rivales/${rival.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      await load(); // refresca datos
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
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
            Próximo partido: {prettyDate(rival.nextMatchDate)} {rival.nextMatchCompetition ? `• ${rival.nextMatchCompetition}` : ""}
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
        {tab === "resumen" && form && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Resumen</h2>

            {/* Vista compacta actual */}
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-[11px] text-gray-500">DT</div>
                <div className="font-medium">{rival.coach || "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[11px] text-gray-500">Sistema base</div>
                <div className="font-medium">{rival.baseSystem || "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[11px] text-gray-500">Próximo partido</div>
                <div className="font-medium">
                  {prettyDate(rival.nextMatchDate)} {rival.nextMatchCompetition ? `• ${rival.nextMatchCompetition}` : ""}
                </div>
              </div>
            </div>

            {/* Editor inline (CT) */}
            <form onSubmit={handleSaveResumen} className="grid md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">DT</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder="Ej: Martín Demichelis"
                  value={form.coach ?? ""}
                  onChange={(e) => setForm((f) => ({ ...(f as any), coach: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">Sistema base</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder='Ej: "4-3-3"'
                  value={form.baseSystem ?? ""}
                  onChange={(e) => setForm((f) => ({ ...(f as any), baseSystem: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">Fecha próximo partido</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={form.nextMatchDate ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...(f as any), nextMatchDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">Competencia</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder="Ej: LPF, Copa, Reserva…"
                  value={form.nextMatchCompetition ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...(f as any), nextMatchCompetition: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
                  onClick={() => {
                    // resetea a valores actuales del rival
                    setForm({
                      coach: rival.coach ?? "",
                      baseSystem: rival.baseSystem ?? "",
                      nextMatchDate: dateForInput(rival.nextMatchDate),
                      nextMatchCompetition: rival.nextMatchCompetition ?? "",
                    });
                  }}
                >
                  Deshacer cambios
                </button>
                <button
                  type="submit"
                  disabled={saving || !resumenDirty}
                  className={`px-3 py-1.5 rounded-xl text-xs ${
                    saving || !resumenDirty
                      ? "bg-gray-200 text-gray-500"
                      : "bg-black text-white hover:opacity-90"
                  }`}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "plan" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Plan de partido</h2>
            <p className="text-sm text-gray-600">
              Aquí el CT podrá subir la charla oficial y un informe visual. (Lo implementamos en el próximo paso.)
            </p>
          </div>
        )}

        {tab === "videos" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Videos</h2>
            <p className="text-sm text-gray-600">
              Clips del rival y nuestros enfrentamientos. (Próximo paso, luego de Plan.)
            </p>
          </div>
        )}

        {tab === "stats" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
            <p className="text-sm text-gray-600">
              Últimos partidos, goles a favor/en contra, posesión. (A implementar.)
            </p>
          </div>
        )}

        {tab === "notas" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-gray-600">
              Solo visible para CT: observaciones y checklist. (A implementar.)
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
