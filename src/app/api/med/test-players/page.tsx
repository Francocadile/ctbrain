"use client";

import { useEffect, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";

type Player = { id: string; name: string | null; email: string | null };

export default function TestPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/med/users/players", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancel) setPlayers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Error");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    run();
    return () => { cancel = true; };
  }, []);

  return (
    <RoleGate allow={["MEDICO","ADMIN"]}>
      <main className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Test · Jugadores (role=JUGADOR)</h1>
        {loading && <div>Cargando…</div>}
        {err && <div className="text-red-600 text-sm">Error: {err}</div>}
        {!loading && !err && players.length === 0 && (
          <div className="text-gray-500 text-sm">Sin jugadores</div>
        )}
        <ul className="space-y-2">
          {players.map(p => (
            <li key={p.id} className="rounded border p-2 bg-white">
              <div className="font-medium">{p.name || "—"}</div>
              <div className="text-xs text-gray-600">{p.email || p.id}</div>
            </li>
          ))}
        </ul>
      </main>
    </RoleGate>
  );
}
