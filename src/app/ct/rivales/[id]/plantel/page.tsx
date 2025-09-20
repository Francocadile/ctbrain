// src/app/ct/rivales/[id]/plantel/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* ===== Tipos ===== */
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

type PlayerEndpoint = {
  basics?: RivalBasics;
  visibility?: { showSquad?: boolean };
  squad?: SquadPlayer[]; // opcional desde /player
};

/* ===== Utils ===== */
function numOrNull(n: any): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}
function sortPlayers(a: SquadPlayer, b: SquadPlayer) {
  const an = Number.isFinite(a.number as number) ? (a.number as number) : 9999;
  const bn = Number.isFinite(b.number as number) ? (b.number as number) : 9999;
  if (an !== bn) return an - bn;
  return (a.name || "").localeCompare(b.name || "");
}

/* ===== Página ===== */
export default function PlantelPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  // header
  const [basics, setBasics] = useState<RivalBasics | null>(null);
  const [loadingBasics, setLoadingBasics] = useState(true);

  // squad (CT)
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Vista jugador: lee de ?player=1 y recuerda en localStorage
  const initialPlayer = useMemo(() => {
    if (search.get("player") === "1") return true;
    try {
      return typeof window !== "undefined" && localStorage.getItem("ct.playerPreview") === "1";
    } catch {
      return false;
    }
  }, [search]);
  const [playerPreview, setPlayerPreview] = useState<boolean>(initialPlayer);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerCanSee, setPlayerCanSee] = useState<boolean | null>(null);
  const [playerSquad, setPlayerSquad] = useState<SquadPlayer[] | null>(null);

  // búsqueda
  const [q, setQ] = useState("");

  // alta manual
  const [newNumber, setNewNumber] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newPos, setNewPos] = useState<string>("");
  const [newVidTitle, setNewVidTitle] = useState<string>("");
  const [newVidUrl, setNewVidUrl] = useState<string>("");

  /* ===== Sincronizar playerPreview con URL + localStorage ===== */
  useEffect(() => {
    try {
      localStorage.setItem("ct.playerPreview", playerPreview ? "1" : "0");
    } catch {}
    const url = new URL(window.location.href);
    if (playerPreview) url.searchParams.set("player", "1");
    else url.searchParams.delete("player");
    window.history.replaceState(null, "", url.toString());
  }, [playerPreview]);

  function copyPlayerLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("player", "1");
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        // feedback sutil
        const el = document.getElementById("copy-hint");
        if (el) {
          el.textContent = "Link copiado";
          setTimeout(() => (el.textContent = ""), 1400);
        } else {
          alert("Link copiado");
        }
      })
      .catch(() => alert("No se pudo copiar el link"));
  }

  /* ===== Cargas ===== */
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

  async function loadSquadCT() {
    setLoading(true);
    try {
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
  }

  useEffect(() => {
    loadSquadCT();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPlayerSafe() {
    setPlayerLoading(true);
    try {
      const r = await fetch(`/api/ct/rivales/${id}/player`, { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { data?: PlayerEndpoint };
      const data = j?.data || {};
      const can = !!data?.visibility?.showSquad;
      setPlayerCanSee(can);
      setPlayerSquad(Array.isArray(data?.squad) ? data.squad! : null);
    } finally {
      setPlayerLoading(false);
    }
  }
  useEffect(() => {
    if (playerPreview) loadPlayerSafe();
  }, [playerPreview, id]);

  /* ===== Alta manual ===== */
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

  /* ===== Guardar todo (CT) ===== */
  async function saveAll() {
    setSaving(true);
    try {
      const payload = {
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

      await loadSquadCT();
      if (playerPreview) await loadPlayerSafe();

      alert("Plantel guardado");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar el plantel");
    } finally {
      setSaving(false);
    }
  }

  /* ===== Filtros / ordenar ===== */
  const filteredCT = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = [...players].sort(sortPlayers);
    if (!t) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        (p.position || "").toLowerCase().includes(t) ||
        String(p.number || "").includes(t)
    );
  }, [players, q]);

  const filteredPlayer = useMemo(() => {
    const arr = (playerSquad && playerSquad.length ? [...playerSquad] : [...players]).sort(sortPlayers);
    const t = q.trim().toLowerCase();
    if (!t) return arr;
    return arr.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        (p.position || "").toLowerCase().includes(t) ||
        String(p.number || "").includes(t)
    );
  }, [playerSquad, players, q]);

  /* ===== Render ===== */
  return (
    <div className="p-4 space-y-4">
      {/* breadcrumb + toggle + copiar link */}
      <div className="text-sm text-gray-600 flex items-center justify-between">
        <div>
          <Link href={`/ct/rivales/${id}`} className="underline">Rivales</Link>
          <span className="mx-1">/</span>
          <span className="font-medium">Plantel</span>
        </div>

        <div className="flex items-center gap-2">
          {playerPreview && (
            <>
              <button
                onClick={copyPlayerLink}
                className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
                title="Copiar link de vista jugador"
              >
                Copiar link
              </button>
              <span id="copy-hint" className="text-[11px] text-emerald-700"></span>
            </>
          )}

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

      {/* búsqueda + guardar */}
      <div className="flex items-center justify-between gap-2">
        <input
          className="rounded-md border px-2 py-1.5 text-sm w-64"
          placeholder="Buscar jugador…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!playerPreview && (
          <button
            onClick={saveAll}
            disabled={saving}
            className={`px-3 py-1.5 rounded-xl text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
          >
            {saving ? "Guardando…" : "Guardar plantel"}
          </button>
        )}
      </div>

      {/* Vista jugador */}
      {playerPreview ? (
        <div className="rounded-xl border bg-white">
          <div className="px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
            Plantel (vista jugador)
          </div>
          <div className="p-3">
            {playerLoading ? (
              <div className="text-sm text-gray-500">Cargando…</div>
            ) : playerCanSee === false ? (
              <div className="text-sm text-gray-500">Plantel oculto para jugadores.</div>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 w-16">#</th>
                      <th className="text-left p-2 min-w-[220px]">Jugador</th>
                      <th className="text-left p-2 w-40">Posición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayer.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-3 text-gray-500">
                          {playerCanSee ? "Sin jugadores." : "Plantel oculto para jugadores."}
                        </td>
                      </tr>
                    ) : (
                      filteredPlayer.map((p, i) => (
                        <tr key={`${p.id || p.name}-${i}`} className="border-t">
                          <td className="p-2">{Number.isFinite(p.number as number) ? p.number : ""}</td>
                          <td className="p-2">{p.name}</td>
                          <td className="p-2">{p.position || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {playerCanSee && !playerSquad && (
              <div className="mt-2 text-xs text-amber-700">
                Tip: si querés que esta vista use datos “player-safe” desde el backend, devolvé <code>squad</code> en <code>/api/ct/rivales/[id]/player</code>.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* alta manual - SOLO CT */}
          <div className="rounded-xl border p-3 bg-gray-50">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Alta manual de jugador (opcional)</div>
            <div className="grid lg:grid-cols-5 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-gray-500">#</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  inputMode="numeric"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="Dorsal"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] text-gray-500">Jugador *</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Posición</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  placeholder="Ej: DL"
                />
              </div>
              <div className="lg:col-span-5 md:col-span-4 grid md:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500">Título de video (opcional)</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={newVidTitle}
                    onChange={(e) => setNewVidTitle(e.target.value)}
                    placeholder="Highlights vs…"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] text-gray-500">URL del video</label>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={newVidUrl}
                    onChange={(e) => setNewVidUrl(e.target.value)}
                    placeholder="https://…"
                    onKeyDown={(e) => (e.key === "Enter" ? (e.preventDefault(), addManualPlayer()) : null)}
                  />
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

          {/* tabla CT */}
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
                ) : filteredCT.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-gray-500">
                      Sin jugadores. Podés agregarlos manualmente arriba o cargar el CSV en{" "}
                      <Link href={`/ct/rivales/${id}?tab=importar`} className="underline">Importar → CSV</Link>.
                    </td>
                  </tr>
                ) : (
                  filteredCT.map((p, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="p-2">
                        <input
                          className="w-16 rounded-md border px-2 py-1"
                          inputMode="numeric"
                          value={p.number ?? ""}
                          onChange={(e) =>
                            patchPlayer(i, { number: e.target.value === "" ? null : numOrNull(e.target.value) })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full rounded-md border px-2 py-1"
                          value={p.name}
                          onChange={(e) => patchPlayer(i, { name: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full rounded-md border px-2 py-1"
                          value={p.position ?? ""}
                          onChange={(e) => patchPlayer(i, { position: e.target.value })}
                          placeholder="Ej: MC"
                        />
                      </td>
                      <td className="p-2">
                        {p.video?.url ? (
                          <a href={p.video.url} className="underline" target="_blank" rel="noreferrer">
                            {p.video.title || p.video.url}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            className="rounded-md border px-2 py-1"
                            placeholder="Título"
                            value={p.video?.title ?? ""}
                            onChange={(e) => patchPlayerVideo(i, { title: e.target.value })}
                          />
                          <input
                            className="md:col-span-2 rounded-md border px-2 py-1"
                            placeholder="URL https://…"
                            value={p.video?.url ?? ""}
                            onChange={(e) => patchPlayerVideo(i, { url: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => removePlayer(i)}
                          className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
                        >
                          Borrar
                        </button>
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
        </>
      )}
    </div>
  );
}
