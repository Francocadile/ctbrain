// src/app/ct/scouting/player/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type ScoutingStatus = "ACTIVO" | "WATCHLIST" | "DESCARTADO";

type Category = {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
};

type Player = {
  id: string;
  fullName: string;
  positions: string[];
  club: string | null;
  estado: ScoutingStatus;
  categoriaId: string | null;

  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  playerPhone: string | null;
  playerEmail: string | null;
  instagram: string | null;

  videos: string[];
  notes: string | null;
  rating: number | null;
};

export default function PlayerEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const playerId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [original, setOriginal] = useState<Player | null>(null);

  const [form, setForm] = useState<Player>(() => ({
    id: "",
    fullName: "",
    positions: [],
    club: null,
    estado: "ACTIVO",
    categoriaId: null,

    agentName: null,
    agentPhone: null,
    agentEmail: null,
    playerPhone: null,
    playerEmail: null,
    instagram: null,

    videos: [],
    notes: null,
    rating: null,
  }));

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);

  async function load() {
    setLoading(true);
    try {
      // jugador
      const resPlayer = await fetch(`/api/ct/scouting/players/${playerId}`, { cache: "no-store" });
      if (!resPlayer.ok) throw new Error("No se pudo cargar el jugador");
      const pj: Player = (await resPlayer.json()).data;

      // categorías
      const resCats = await fetch(`/api/ct/scouting/categories`, { cache: "no-store" });
      if (!resCats.ok) throw new Error("No se pudieron cargar categorías");
      const cats: Category[] = (await resCats.json()).data;

      setCategories(cats);
      setOriginal(pj);
      setForm({
        ...pj,
        club: pj.club ?? null,
        notes: pj.notes ?? null,
        rating: pj.rating ?? null,
        categoriaId: pj.categoriaId ?? null,
        positions: Array.isArray(pj.positions) ? pj.positions : [],
        videos: Array.isArray(pj.videos) ? pj.videos : [],
        agentName: pj.agentName ?? null,
        agentPhone: pj.agentPhone ?? null,
        agentEmail: pj.agentEmail ?? null,
        playerPhone: pj.playerPhone ?? null,
        playerEmail: pj.playerEmail ?? null,
        instagram: pj.instagram ?? null,
      });
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la ficha.");
      router.push("/ct/scouting");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (playerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      alert("Ingresá el nombre completo del jugador");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        positions: form.positions.filter(Boolean),
        club: form.club || null,
        estado: form.estado,
        categoriaId: form.categoriaId || null,

        agentName: form.agentName || null,
        agentPhone: form.agentPhone || null,
        agentEmail: form.agentEmail || null,
        playerPhone: form.playerPhone || null,
        playerEmail: form.playerEmail || null,
        instagram: form.instagram || null,

        videos: (form.videos || []).filter(Boolean),
        notes: form.notes || null,
        rating: typeof form.rating === "number" ? form.rating : null,
        tags: [], // reservado
      };

      const res = await fetch(`/api/ct/scouting/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || "No se pudo guardar");
      }
      const pj: Player = (await res.json()).data;
      setOriginal(pj);
      setForm(pj);
      alert("Guardado");
      router.push(`/ct/scouting/player/${playerId}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = confirm("¿Eliminar jugador? Esta acción no se puede deshacer.");
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ct/scouting/players/${playerId}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || "No se pudo borrar");
      }
      alert("Jugador eliminado");
      router.push("/ct/scouting");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al borrar");
    } finally {
      setDeleting(false);
    }
  }

  // Helpers UI
  function addPosition(p: string) {
    const v = (p || "").trim();
    if (!v) return;
    if (!form.positions.includes(v)) {
      setForm(f => ({ ...f, positions: [...f.positions, v] }));
    }
  }
  function removePosition(p: string) {
    setForm(f => ({ ...f, positions: f.positions.filter(x => x !== p) }));
  }
  function addVideo(url: string) {
    const v = (url || "").trim();
    if (!v) return;
    setForm(f => ({ ...f, videos: [...(f.videos || []), v] }));
  }
  function removeVideo(idx: number) {
    setForm(f => ({ ...f, videos: f.videos.filter((_, i) => i !== idx) }));
  }

  if (loading) {
    return <div className="p-4 text-gray-500">Cargando…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Editar jugador</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Actualizá datos, contacto, rating y videos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/ct/scouting/player/${playerId}`}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            ← Volver a ficha
          </Link>
          <Link
            href={"/ct/scouting"}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Scouting
          </Link>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Datos básicos */}
        <section className="lg:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
            Datos
          </div>
          <div className="p-3 grid md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] text-gray-500">Nombre completo</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.fullName}
                onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-500">Club</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.club ?? ""}
                onChange={(e) => setForm(f => ({ ...f, club: e.target.value || null }))}
                placeholder="Ej. Gimnasia de Mendoza"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-500">Estado</label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.estado}
                onChange={(e) => setForm(f => ({ ...f, estado: e.target.value as ScoutingStatus }))}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="WATCHLIST">WATCHLIST</option>
                <option value="DESCARTADO">DESCARTADO</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-500">Categoría</label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.categoriaId ?? ""}
                onChange={(e) =>
                  setForm(f => ({ ...f, categoriaId: e.target.value ? e.target.value : null }))
                }
              >
                <option value="">— Sin categoría —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.activa ? "" : "(archivada)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-500">Rating (0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.rating ?? ""}
                onChange={(e) =>
                  setForm(f => ({
                    ...f,
                    rating: e.target.value === "" ? null : Math.max(0, Math.min(10, parseInt(e.target.value))),
                  }))
                }
                placeholder="—"
              />
            </div>

            {/* Positions */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] text-gray-500">Posiciones</label>
              <PositionsEditor
                values={form.positions}
                onAdd={addPosition}
                onRemove={removePosition}
              />
            </div>
          </div>
        </section>

        {/* Col 2: Contacto */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
            Contacto
          </div>
          <div className="p-3 space-y-3">
            <Field label="Agente" value={form.agentName ?? ""} onChange={(v) => setForm(f => ({ ...f, agentName: v || null }))} />
            <Field label="Tel. agente" value={form.agentPhone ?? ""} onChange={(v) => setForm(f => ({ ...f, agentPhone: v || null }))} />
            <Field label="Email agente" value={form.agentEmail ?? ""} onChange={(v) => setForm(f => ({ ...f, agentEmail: v || null }))} />
            <Field label="Tel. jugador" value={form.playerPhone ?? ""} onChange={(v) => setForm(f => ({ ...f, playerPhone: v || null }))} />
            <Field label="Email jugador" value={form.playerEmail ?? ""} onChange={(v) => setForm(f => ({ ...f, playerEmail: v || null }))} />
            <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => setForm(f => ({ ...f, instagram: v || null }))} />
          </div>
        </section>

        {/* Videos */}
        <section className="lg:col-span-3 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
            Videos
          </div>
          <div className="p-3">
            <VideoList
              items={form.videos || []}
              onAdd={addVideo}
              onRemove={removeVideo}
            />
          </div>
        </section>

        {/* Notas */}
        <section className="lg:col-span-3 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
            Notas
          </div>
          <div className="p-3">
            <textarea
              className="w-full min-h-[120px] rounded-md border px-2 py-1.5 text-sm"
              value={form.notes ?? ""}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value || null }))}
              placeholder="Observaciones técnicas, métricas, etc."
            />
          </div>
        </section>

        {/* Actions */}
        <div className="lg:col-span-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">{dirty ? "Cambios sin guardar" : "Sin cambios"}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/ct/scouting/player/${playerId}`)}
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-3 py-1.5 rounded-xl text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-red-50 text-red-700 border-red-200"
            >
              {deleting ? "Borrando…" : "Borrar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---- Subcomponentes simples ---- */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-gray-500">{label}</label>
      <input
        className="w-full rounded-md border px-2 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function PositionsEditor({
  values,
  onAdd,
  onRemove,
}: {
  values: string[];
  onAdd: (p: string) => void;
  onRemove: (p: string) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          className="w-64 rounded-md border px-2 py-1.5 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej. Delantero, Extremo, Volante…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (input.trim()) {
                onAdd(input.trim());
                setInput("");
              }
            }
          }}
        />
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
          onClick={() => {
            if (input.trim()) {
              onAdd(input.trim());
              setInput("");
            }
          }}
        >
          Agregar
        </button>
      </div>
      {values.length === 0 ? (
        <div className="text-sm text-gray-500 italic">Sin posiciones cargadas</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              {p}
              <button
                type="button"
                className="text-gray-500 hover:text-black"
                onClick={() => onRemove(p)}
                aria-label={`Quitar ${p}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoList({
  items,
  onAdd,
  onRemove,
}: {
  items: string[];
  onAdd: (url: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="w-full md:w-[520px] rounded-md border px-2 py-1.5 text-sm"
          placeholder="Pega un enlace (YouTube, Drive, etc.)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (url.trim()) {
                onAdd(url.trim());
                setUrl("");
              }
            }
          }}
        />
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
          onClick={() => {
            if (url.trim()) {
              onAdd(url.trim());
              setUrl("");
            }
          }}
        >
          Agregar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 italic">Sin videos cargados</div>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {items.map((v, i) => (
            <li key={`${v}-${i}`} className="flex items-center justify-between gap-2">
              <a href={v} target="_blank" rel="noreferrer" className="underline break-all">
                {v}
              </a>
              <button
                type="button"
                className="text-xs rounded-md border px-2 py-0.5 hover:bg-gray-50"
                onClick={() => onRemove(i)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
