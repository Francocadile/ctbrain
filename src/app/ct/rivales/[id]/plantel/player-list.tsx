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
  key_passes?: number;
  progressive_passes?: number;
  dribbles_attempted?: number;
  dribbles_success_pct?: number;
  duels_won?: number;
  duels_total?: number;
  aerials_won?: number;
  aerials_total?: number;
  interceptions?: number;
  recoveries?: number;
  touches_in_box?: number;
  fouls_committed?: number;
  fouls_suffered?: number;
  yellow_cards?: number;
  red_cards?: number;
  fk_direct_shots?: number;
  fk_on_target?: number;
  corners_taken?: number;
  // video
  videoUrl?: string;
  videoTitle?: string;
};

export default function PlayerList({
  rivalId,
  initialPlayers,
}: {
  rivalId: string;
  initialPlayers: Player[];
}) {
  const [players, setPlayers] = useState<Player[]>(() => initialPlayers || []);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return players;
    return players.filter(p =>
      (p.player_name || "").toLowerCase().includes(f) ||
      (p.position || "").toLowerCase().includes(f)
    );
  }, [filter, players]);

  async function saveVideo(p: Player, videoUrl: string, videoTitle: string) {
    const name = p.player_name || "";
    if (!name || !videoUrl) return;
    setSaving(name);
    try {
      const res = await fetch(`/api/ct/rivales/${rivalId}/players/video`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: name, videoUrl, videoTitle }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Error ${res.status}`);
      }
      // Optimistic update
      setPlayers(prev => {
        const idx = prev.findIndex(x => (x.player_name || "").toLowerCase() === name.toLowerCase());
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
      {/* barra de búsqueda */}
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar jugador o posición..."
          className="border rounded-md px-3 py-2 w-full"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Jugador</Th>
              <Th>Pos</Th>
              <Th>Min</Th>
              <Th>G</Th>
              <Th>xG</Th>
              <Th>Asis</Th>
              <Th>Tiros</Th>
              <Th>TPuerta</Th>
              <Th>Prec. Pase %</Th>
              <Th>Duelos (G/T)</Th>
              <Th>Aéreos (G/T)</Th>
              <Th>Interc.</Th>
              <Th>Recup.</Th>
              <Th>Video</Th>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 border-b text-left whitespace-nowrap">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 border-b align-top ${className}`}>{children}</td>;
}

function num(n?: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : "-";
}

function Row({
  p,
  saving,
  onSave,
}: {
  p: Player;
  saving: boolean;
  onSave: (url: string, title: string) => void;
}) {
  const [url, setUrl] = useState(p.videoUrl || "");
  const [title, setTitle] = useState(p.videoTitle || "");

  return (
    <tr className="hover:bg-gray-50">
      <Td className="font-medium whitespace-nowrap">{p.player_name || "-"}</Td>
      <Td>{p.position || "-"}</Td>
      <Td>{num(p.minutes)}</Td>
      <Td>{num(p.goals)}</Td>
      <Td>{num(p.xg)}</Td>
      <Td>{num(p.assists)}</Td>
      <Td>{num(p.shots_total)}</Td>
      <Td>{num(p.shots_on_target)}</Td>
      <Td>{num(p.pass_accuracy_pct)}</Td>
      <Td>{`${num(p.duels_won)}/${num(p.duels_total)}`}</Td>
      <Td>{`${num(p.aerials_won)}/${num(p.aerials_total)}`}</Td>
      <Td>{num(p.interceptions)}</Td>
      <Td>{num(p.recoveries)}</Td>
      <Td className="min-w-[280px]">
        <div className="flex flex-col gap-2">
          {p.videoUrl ? (
            <a href={p.videoUrl} target="_blank" className="text-blue-600 underline truncate">
              {p.videoTitle || "Ver video"}
            </a>
          ) : (
            <span className="text-gray-400">Sin video</span>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (opcional)"
            className="border rounded px-2 py-1"
          />
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL del video (Drive/YouTube/Wyscout)"
              className="border rounded px-2 py-1 flex-1"
            />
            <button
              onClick={() => onSave(url, title)}
              disabled={saving || !url}
              className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Td>
    </tr>
  );
}
