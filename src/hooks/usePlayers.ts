"use client";

import * as React from "react";

export type PlayerOpt = { id: string; label: string };

type ErrorKind = "EMPTY" | "ERR" | null;

function usePlayersBase(endpoint: string) {
  const [players, setPlayers] = React.useState<PlayerOpt[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ErrorKind>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  }, [endpoint]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { players, loading, error, reload };
}

/**
 * Hook genérico (compat) – usa el endpoint médico.
 * Devuelve { players, loading, error, reload }.
 */
export function usePlayers() {
  return usePlayersBase("/api/med/users/players");
}

/**
 * Hook explícito para pantallas de Médico.
 * Igual que usePlayers, exportado para mantener la API esperada.
 */
export function usePlayersMed() {
  return usePlayersBase("/api/med/users/players");
}
