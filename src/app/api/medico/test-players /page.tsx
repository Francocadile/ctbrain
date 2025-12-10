// src/app/med/test-players/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React from "react";

type Row = { id: string; name: string | null; email: string | null };

export default function TestPlayersPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/medico/users/players", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: Row[]) => setRows(data))
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Test · Jugadores (role=JUGADOR)</h1>
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
      {rows === null ? (
        <p>Cargando…</p>
      ) : rows.length === 0 ? (
        <p>Sin jugadores</p>
      ) : (
        <ul>
          {rows.map((u) => (
            <li key={u.id}>
              {u.name || u.email || u.id}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
