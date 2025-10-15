// src/app/ct/rivales/[id]/plantel/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Tipos
========================= */
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

/* =========================
   Utils
========================= */
function numOrNull(n: any): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function normalizePlayer(p: SquadPlayer): Required<Omit<SquadPlayer, "id">> & { id?: string } {
  return {
    id: p.id,
    number: p.number ?? null,
    name: (p.name || "").trim(),
    position: (p.position ?? null) ? String(p.position).trim() : null,
    video: p.video
      ? {
          title: p.video.title ? String(p.video.title).trim() : null,
          url: p.video.url ? String(p.video.url).trim() : null,
        }
      : null,
  };
}
function eqArrays<A>(a: A[], b: A[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* =========================
   Página
========================= */
export default function PlantelPage() {
  const { id } = useParams<{ id: string }>();

  // header
  const [basics, setBasics] = useState<RivalBasics | null>(null);
  const [loadingBasics, setLoadingBasics] = useState(true);

  // squad (estado editable) + baseline para "Sin cambios"
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [baseline, setBaseline] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // búsqueda
  const [q, setQ] = useState("");

  // alta manual (borrador)
  const [newNumber, setNewNumber] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newPos, setNewPos] = useState<string>("");
  const [newVidTitle, setNewVidTitle] = useState<string>("");
  const [newVidUrl, setNewVidUrl] = useState<string>("");

  // CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /* ============ helpers borrador de alta manual ============ */
  function draftFromManual(): SquadPlayer | null {
    const name = newName.trim();
    const anyOther =
      newNumber.trim() || newPos.trim() || newVidTitle.trim() || newVidUrl.trim();
    if (!name && !anyOther) return null; // nada escrito
    if (!name) return null; // para guardar requiere nombre

    return {
      number: newNumber === "" ? null : numOrNull(newNumber),
      name,
      position: newPos.trim() || null,
      video:
        newVidTitle.trim() || newVidUrl.trim()
          ? { title: newVidTitle.trim() || null, url: newVidUrl.trim() || null }
          : null,
    };
  }
  function clearManualForm() {
    setNewNumber("");
    setNewName("");
    setNewPos("");
    setNewVidTitle("");
    setNewVidUrl("");
  }

  /* ============ cargas ============ */
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
      const json = await res.json().catch(() => ({} as any));
      const arr: SquadPlayer[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.players)
        ? json.data.players
        : [];
      const clean = (arr || []).map((p) => ({
        id: p.id,
        number: numOrNull((p as any).number),
        name: p.name ?? "",
        position: p.position ?? null,
        video: p.video ?? null,
      }));
      setPlayers(clean);
      setBaseline(clean.map(normalizePlayer)); // baseline normalizado
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSquadCT();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ============ alta manual ============ */
  function addManualPlayer() {
    const draft = draftFromManual();
    if (!draft) return;
    setPlayers((ps) => [draft, ...ps]);
    clearManualForm();
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

  /* ============ guardar ============ */
  async function saveAll() {
    setSaving(true);
    try {
      // si hay algo escrito en “Alta manual”, lo incluyo aunque no hayas apretado “+ Agregar…”
      const draft = draftFromManual();
      const list = draft ? [draft, ...players] : players;

      const payload = {
        squad: list.map((p) => normalizePlayer(p)),
      };

      const res = await fetch(`/api/ct/rivales/${id}/squad`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadSquadCT(); // refresco y fijo baseline
      if (draft) clearManualForm();

      alert("Plantel guardado");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar el plantel");
    } finally {
      setSaving(false);
    }
  }

  /* ============ CSV (import local) ============ */
  async function readFileText(file: File) {
    return new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = reject;
      fr.readAsText(file);
    });
  }

  function parseCSV(text: string): SquadPlayer[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) return [];

    // header flexible
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (names: string[]) =>
      header.findIndex((h) => names.includes(h));

    const iNum = idx(["#", "number", "dorsal"]);
    const iName = idx(["name", "jugador", "player", "nombre"]);
    const iPos = idx(["position", "posicion", "pos"]);
    const iVidTitle = idx(["videotitle", "video_title", "titulo", "titulo video", "title"]);
    const iVidUrl = idx(["videourl", "video_url", "url", "url video", "link"]);

    const out: SquadPlayer[] = [];

    for (let k = 1; k < lines.length; k++) {
      const cols = lines[k].split(",").map((c) => c.trim());
      const name = iName >= 0 ? cols[iName] : "";
      if (!name) continue;

      const numberRaw = iNum >= 0 ? cols[iNum] : "";
      const pos = iPos >= 0 ? cols[iPos] : "";
      const vt = iVidTitle >= 0 ? cols[iVidTitle] : "";
      const vu = iVidUrl >= 0 ? cols[iVidUrl] : "";

      out.push({
        name,
        number: numberRaw === "" ? null : numOrNull(numberRaw),
        position: pos || null,
        video: vt || vu ? { title: vt || null, url: vu || null } : null,
      });
    }
    return out;
  }

  async function importCSVReplace() {
    if (!csvFile) return;
    try {
      const text = await readFileText(csvFile);
      const parsed = parseCSV(text);
      setPlayers(parsed);
      // no tocamos baseline; “Guardar plantel” confirmará cambios
    } catch {
      alert("No se pudo leer el CSV");
    }
  }

  async function importCSVAppend() {
    if (!csvFile) return;
    try {
      const text = await readFileText(csvFile);
      const parsed = parseCSV(text);
      setPlayers((prev) => [...parsed, ...prev]);
    } catch {
      alert("No se pudo leer el CSV");
    }
  }

  function exportCSV() {
    const rows = [
      ["number", "name", "position", "videoTitle", "videoUrl"],
      ...players.map((p) => [
        p.number ?? "",
        p.name ?? "",
        p.position ?? "",
        p.video?.title ?? "",
        p.video?.url ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(String).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantel.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ============ derivados ============ */
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

  const draftExists = !!draftFromManual();
  const isDirty = useMemo(() => {
    const normCurrent = players.map(normalizePlayer);
    const normBaseline = baseline.map(normalizePlayer);
    return draftExists || !eqArrays(normCurrent, normBaseline);
  }, [players, baseline, draftExists]);

  /* ============ UI ============ */
  return (
    <div className="p-4 space-y-4">
      {/* breadcrumb */}
      <div className="text-sm text-gray-600">
        <Link href="/ct/rivales" className="underline">
          Rivales
        </Link>
        <span className="mx-1">/</span>
        <span className="font-medium">Plantel</span>
      </div>

      {/* título */}
      <div className="flex items-end justify-between gap-2">
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

        {/* Acciones globales derechas: Guardar SIEMPRE visible */}
        <div className="flex items-center gap-2">
          <button
            onClick={saveAll}
            disabled={saving}
            className={`px-3 py-1.5 rounded-xl text-xs ${
              saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {saving ? "Guardando…" : "Guardar plantel"}
          </button>
          {!isDirty && (
            <span className="text-[11px] text-gray-500">Sin cambios</span>
          )}
        </div>
      </div>

      {/* búsqueda + CSV */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          className="rounded-md border px-2 py-1.5 text-sm w-64"
          placeholder="Buscar jugador…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
            >
              Seleccionar archivo
            </button>
          </label>
          <span className="text-xs text-gray-500 min-w-[140px] truncate">
            {csvFile ? csvFile.name : "Sin archivos seleccionados"}
          </span>

          <button
            onClick={importCSVReplace}
            disabled={!csvFile}
            className={`px-3 py-1.5 rounded-xl text-xs ${
              !csvFile ? "bg-gray-200 text-gray-500" : "border hover:bg-gray-50"
            }`}
          >
            Reemplazar por CSV
          </button>
          <button
            onClick={importCSVAppend}
            disabled={!csvFile}
            className={`px-3 py-1.5 rounded-xl text-xs ${
              !csvFile ? "bg-gray-200 text-gray-500" : "border hover:bg-gray-50"
            }`}
          >
            Agregar del CSV
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* alta manual */}
      <div className="rounded-xl border p-3 bg-gray-50">
        <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
          Alta manual de jugador (opcional)
        </div>
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
                onKeyDown={(e) =>
                  e.key === "Enter" ? (e.preventDefault(), addManualPlayer()) : null
                }
              />
            </div>
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={addManualPlayer}
            className="text-xs px-3 py-1.5 rounded-xl border hover:bg-white"
          >
            + Agregar al plantel
          </button>
          <span className="ml-3 text-xs text-gray-500">
            También podés cargar un CSV arriba y después <b>Guardar plantel</b>.
          </span>
        </div>
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
              <tr>
                <td colSpan={6} className="p-3 text-gray-500">
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-gray-500">
                  Sin jugadores. Agregá manualmente arriba o cargá el CSV en{" "}
                  <Link
                    href={`/ct/rivales/${id}?tab=importar`}
                    className="underline"
                  >
                    Importar → CSV
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="p-2">
                    <input
                      className="w-16 rounded-md border px-2 py-1"
                      inputMode="numeric"
                      value={p.number ?? ""}
                      onChange={(e) =>
                        patchPlayer(i, {
                          number:
                            e.target.value === "" ? null : numOrNull(e.target.value),
                        })
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
                      <a
                        href={p.video.url}
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                      >
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
        Tip: exportá el listado actual con <b>Exportar CSV</b> (respeta filtro/orden)
        y reimportalo cuando quieras.
      </div>
    </div>
  );
}
