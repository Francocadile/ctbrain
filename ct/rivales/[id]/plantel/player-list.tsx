"use client";

import { useMemo, useState } from "react";

type Player = {
  player_name?: string;
  position?: string;
  minutes?: number;
  goals?: number;
  xg?: number;
  assists?: number;
  shots_total?: number;
  shots_on_target?: number;
  passes_total?: number;
  passes_completed?: number;
  pass_accuracy_pct?: number;
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  aerials_won?: number;
  fouls?: number;
  yellow_cards?: number;
  red_cards?: number;
  rating?: number;
  videoUrl?: string;
  videoTitle?: string;
  [k: string]: any;
};

export default function PlayerList({
  rivalId,
  initialPlayers,
}: {
  rivalId: string;
  initialPlayers: Player[];
}) {
  const [players, setPlayers] = useState<Player[]>(() => initialPlayers || []);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return players;
    return players.filter((p) =>
      String(p.player_name || "")
        .toLowerCase()
        .includes(f)
    );
  }, [filter, players]);

  async function saveVideo(p: Player, videoUrl: string, videoTitle: string) {
    const name = p.player_name || "";
    if (!name || !videoUrl) return;
    setSaving(name);
    try {
      const res = await fetch(`/api/ct/rivales/${rivalId}/player/video`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: name, videoUrl, videoTitle }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Error ${res.status}`);
      }
      // Optimistic update
      setPlayers((prev) => {
        const idx = prev.findIndex(
          (x) =>
            (x.player_name || "").toLowerCase() === name.toLowerCase()
        );
        const next = [...prev];
        const merged = { ...(prev[idx] || {}), videoUrl, videoTitle };
        if (idx >= 0) next[idx] = merged;
        else next.push({ player_name: name, videoUrl, videoTitle });
        return next;
      });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Buscar jugador…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <Th>#</Th>
              <Th>Jugador</Th>
              <Th>Posición</Th>
              <Th>Video</Th>
              <Th className="w-[520px]">Cargar video</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <Row
                key={(p.player_name || "") + i}
                p={p}
                saving={saving === (p.player_name || "")}
                onSave={(url, title) => saveVideo(p, url, title)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center py-6 text-gray-500">
                  Sin jugadores. Cargá el CSV de jugadores en Importar → CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 border-b text-left whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function Row({
  p,
  onSave,
  saving,
}: {
  p: Player;
  onSave: (url: string, title: string) => void;
  saving: boolean;
}) {
  const [url, setUrl] = useState(p.videoUrl || "");
  const [title, setTitle] = useState(p.videoTitle || "");

  return (
    <tr className="border-t">
      <Td className="whitespace-nowrap">{p["number"] ?? ""}</Td>
      <Td className="whitespace-nowrap font-medium">
        {p.player_name || "—"}
      </Td>
      <Td className="whitespace-nowrap">{p.position || ""}</Td>
      <Td>
        {p.videoUrl ? (
          <a
            href={p.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            Ver video
          </a>
        ) : (
          <span className="text-gray-400">Sin video</span>
        )}
      </Td>
      <Td>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="rounded-md border px-2 py-1 text-sm w-64"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1 text-sm flex-1"
              placeholder="URL del video"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" ? (e.preventDefault(), onSave(url, title)) : null
              }
            />
            <button
              onClick={() => onSave(url, title)}
              disabled={saving || !url}
              className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            >
              {saving ? "Agregando…" : "+ Agregar"}
            </button>
          </div>
        </div>
      </Td>
    </tr>
  );
}
