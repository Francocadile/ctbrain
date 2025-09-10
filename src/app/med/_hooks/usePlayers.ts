// src/app/med/_hooks/usePlayers.ts
"use client";

import * as React from "react";

export type PlayerOpt = { id: string; label: string };

export function usePlayers() {
  const [players, setPlayers] = React.useState<PlayerOpt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch("/api/med/users/players", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((list: any[]) => {
        if (!active) return;
        const opts = (list || []).map((u) => ({
          id: u.id as string,
          label: (u.name as string) || (u.email as string) || (u.id as string),
        }));
        setPlayers(opts);
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return { players, loading, error };
}
