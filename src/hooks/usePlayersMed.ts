"use client";

import * as React from "react";

export type PlayerOpt = { id: string; label: string };

type ErrorKind = "EMPTY" | "ERR" | null;

/**
 * Hook para obtener SOLO jugadores (rol JUGADOR) desde /api/users/players.
 * Devuelve la lista, estados de carga/error y una función reload().
 */
export default function usePlayersMed() {
  const [players, setPlayers] = React.useState<PlayerOpt[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ErrorKind>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/players", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const mapped: PlayerOpt[] = list.map((u: any) => ({
        id: u.id,
        label: u.name || u.email || u.id,
      }));

      setPlayers(mapped);
      if (mapped.length === 0) setError("EMPTY");
    } catch {
      setPlayers([]);
      setError("ERR");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { players, loading, error, reload };
}
