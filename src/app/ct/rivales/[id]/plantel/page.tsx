"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type RivalBasics = {
  id: string;
  name: string;
  coach?: string | null;
  baseSystem?: string | null;
};

type PlayerVideo = {
  title?: string | null;
  url?: string | null;
};

type SquadPlayer = {
  id?: string;
  number?: number | null;
  name: string;
  position?: string | null;
  video?: PlayerVideo | null;
};

export default function PlantelPage() {
  const { id } = useParams<{ id: string }>();

  // header
  const [basics, setBasics] = useState<RivalBasics | null>(null);
  const [loadingBasics, setLoadingBasics] = useState(true);

  // squad
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // búsqueda
  const [q, setQ] = useState("");

  // alta manual
  const [newNumber, setNewNumber] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newPos, setNewPos] = useState<string>("");
  const [newVidTitle, setNewVidTitle] = useState<string>("");
  const [newVidUrl, setNewVidUrl] = useState<string>("");

  // helpers
  function numOrNull(n: any): number | null {
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
  }

  // cargar basics
  useEffect(() => {
    (async () => {
      try {
        setLoadingBasics(true);
        const rb = await fetch(`/api/ct/rivales/${id}`, { cache: "no-store" });
        if (rb.ok) {
          const j = await rb.json();
          setBasics(j?.data as RivalBasics);
        }
      } finally {
        setLoadingBasics(false);
      }
    })();
  }, [id]);

  // cargar plantel
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/ct/rivales/${id}/squad`, { cache: "no-store" });
        if (!res.ok) {
          setPlayers([]);
          return;
        }
        const json = await res.json().catch(() => ({} as any));
        const arr: SquadPlayer[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.players)
          ? json.data.players
          : [];
        setPlayers(
          (arr || []).map((p) => ({
            id: p.id,
            number: numOrNull((p as any).number),
            name: p.name ?? "",
            position: p.position ?? null,
            video: p.video ?? null,
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // alta manual
  function addManualPlayer() {
    const name = newName.trim();
    if (!name) return;
    const player: SquadPlayer = {
      number: newNumber === "" ? null : numOrNull(newNumber),
      name,
      position: newPos.trim() || null,
      video:
        newVidTitle.trim() || newVidUrl.trim()
          ? { title: newVidTitle.trim() || null, url: newVidUrl.trim() || null }
          : null,
    };
    setPlayers((ps) => [player, ...ps]);

    setNewNumber("");
    setNewName("");
    setNewPos("");
    setNewVidTitle("");
    setNewVidUrl("");
  }

  function removePlayer(idx: number) {
    setPlayers((ps) => ps.filter((_, i) => i !== idx));
  }

  function patchPlayer(i: number, patch: Partial<SquadPlayer>) {
    setPlayers((ps) => {
      const arr = [...ps];
      arr[i] = { ...arr[i], ...patch };
      return arr;
    });
  }
  function patchPlayerVideo(i: number, patch: Partial<PlayerVideo>) {
    setPlayers((ps) => {
      const arr = [...ps];
      const current = arr[i].video ?? {};
      arr[i] = { ...arr[i], video: { ...current, ...patch } };
      const v = arr[i].video!;
      if (!v.title && !v.url) arr[i].video = null;
      return arr;
    });
  }

  // guardar todo
  async function saveAll() {
    setSaving(true);
    try {
      const payload = {
        // ahora enviamos "squad" (la API también acepta "players")
        squad: players.map((p) => ({
          id: p.id ?? undefined,
          number: p.number ?? null,
          name: p.name.trim(),
          position: p.position?.toString().trim() || null,
          video: p.video
            ? {
                title: p.video.title?.toString().trim() || null,
                url: p.video.url?.toString().trim() || null,
              }
            : null,
        })),
      };

      const res = await fetch(`/api/ct/rivales/${id}/squad`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      // recargar para sincronizar
      const ref = await fetch(`/api/ct/rivales/${id}/squad`, { cache: "no-store" });
      if (ref.ok) {
        const j = await ref.json().catch(() => ({} as any));
        const arr: SquadPlayer[] = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j?.data?.players)
          ? j.data.players
          : [];
        setPlayers(
          (arr || []).map((p) => ({
            id: p.id,
            number: numOrNull((p as any).number),
            name: p.name ?? "",
            position: p.position ?? null,
            video: p.video ?? null,
          }))
        );
      }

      alert("Plantel guardado");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar el plantel");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        (p.position || "").toLowerCase().includes(t) ||
        String(p.number || "").includes(t)
    );
  }, [players, q]);

  return (
    <div className="p-4 space-y-4">
      {/* breadcrumb */}
      <div className="text-sm text-gray-600">
        <Link href="/ct/rivales" className="underline">Rivales</Link>
        <span className="mx-1">/</span>
        <span className="font-medium">Plantel</span>
      </div>

      {/* título */}
      <div>
        <h1 className="text-xl font-bold">Plantel</h1>
        {loadingBasics ? (
          <div className="text-sm text-gray-500">Cargando…</div>
        ) : basics ? (
          <p className="text-sm text-gray-600">
            DT: <b>{basics.coach || "—"}</b> · Sistema base: {basics.baseSystem || "—"}
          </p>
        ) : null}
      </div>

      {/* alta manual */}
      <div className="rounded-xl border p-3 bg-gray-50">
        <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Alta manual de jugador (opcional)</div>
        <div className="grid lg:grid-cols-5 md:grid-cols-4 gap-2">
          <div>
            <label className="text-[11px] text-gray-500">#</label>
            <input className="w-full rounded-md border px-2 py-1.5 text-sm" inputMode="numeric" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="Dorsal" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] text-gray-500">Jugador *</label>
            <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre y apellido" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500">Posición</label>
            <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={newPos} onChange={(e) => setNewPos(e.target.value)} placeholder="Ej: DL" />
          </div>
          <div className="lg:col-span-5 md:col-span-4 grid md:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-gray-500">Título de video (opcional)</label>
              <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={newVidTitle} onChange={(e) => setNewVidTitle(e.target.value)} placeholder="Highlights vs…" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-gray-500">URL del video</label>
              <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={newVidUrl} onChange={(e) => setNewVidUrl(e.target.value)} placeholder="https://…" onKeyDown={(e) => (e.key === "Enter" ? (e.preventDefault(), addManualPlayer()) : null)} />
            </div>
          </div>
        </div>
        <div className="pt-2">
          <button onClick={addManualPlayer} className="text-xs px-3 py-1.5 rounded-xl border hover:bg-white">+ Agregar al plantel</button>
          <span className="ml-3 text-xs text-gray-500">
            También podés cargar por CSV desde <Link href={`/ct/rivales/${id}?tab=importar`} className="underline">Importar</Link>.
          </span>
        </div>
      </div>

      {/* búsqueda + guardar */}
      <div className="flex items-center justify-between gap-2">
        <input className="rounded-md border px-2 py-1.5 text-sm w-64" placeholder="Buscar jugador…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={saveAll} disabled={saving} className={`px-3 py-1.5 rounded-xl text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}>
          {saving ? "Guardando…" : "Guardar plantel"}
        </button>
      </div>

      {/* tabla */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 w-16">#</th>
              <th className="text-left p-2 min-w-[220px]">Jugador</th>
              <th className="text-left p-2 w-40">Posición</th>
              <th className="text-left p-2 min-w-[240px]">Video</th>
              <th className="text-left p-2 min-w-[260px]">Cargar / editar video</th>
              <th className="p-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-3 text-gray-500">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-gray-500">
                  Sin jugadores. Podés agregarlos manualmente arriba o cargar el CSV en{" "}
                  <Link href={`/ct/rivales/${id}?tab=importar`} className="underline">Importar → CSV</Link>.
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="p-2">
                    <input className="w-16 rounded-md border px-2 py-1" inputMode="numeric" value={p.number ?? ""} onChange={(e) => patchPlayer(i, { number: e.target.value === "" ? null : numOrNull(e.target.value) })} />
                  </td>
                  <td className="p-2">
                    <input className="w-full rounded-md border px-2 py-1" value={p.name} onChange={(e) => patchPlayer(i, { name: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input className="w-full rounded-md border px-2 py-1" value={p.position ?? ""} onChange={(e) => patchPlayer(i, { position: e.target.value })} placeholder="Ej: MC" />
                  </td>
                  <td className="p-2">
                    {p.video?.url ? (
                      <a href={p.video.url} className="underline" target="_blank" rel="noreferrer">
                        {p.video.title || p.video.url}
                      </a>
                    ) : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="p-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input className="rounded-md border px-2 py-1" placeholder="Título" value={p.video?.title ?? ""} onChange={(e) => patchPlayerVideo(i, { title: e.target.value })} />
                      <input className="md:col-span-2 rounded-md border px-2 py-1" placeholder="URL https://…" value={p.video?.url ?? ""} onChange={(e) => patchPlayerVideo(i, { url: e.target.value })} />
                    </div>
                  </td>
                  <td className="p-2">
                    <button onClick={() => removePlayer(i)} className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50">Borrar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Tip: si ya tenés la planilla, cargala por CSV desde{" "}
        <Link href={`/ct/rivales/${id}?tab=importar`} className="underline">Importar</Link>{" "}
        y después ajustá manualmente acá.
      </div>
    </div>
  );
}
