// src/app/med/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { usePlayers } from "../_hooks/usePlayers";

export default function MedInjuriesPage() {
  const { players, loading, error } = usePlayers();
  const [userId, setUserId] = React.useState("");

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Cargar parte clínico — Médico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Solo usuarios con rol <b>MEDICO</b> pueden editar. El CT lo ve en modo lectura.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Atajo de prueba:{" "}
          <a
            href="/api/med/test-players"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            ver lista de jugadores (test)
          </a>
        </p>
      </header>

      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-semibold">Parte diario</h2>

        {/* SELECT DE JUGADOR */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Jugador</label>
          <select
            className="h-10 w-full rounded-md border px-3 text-sm"
            disabled={loading || !!error}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">
              {loading
                ? "Cargando jugadores..."
                : error
                ? "Error al cargar"
                : players.length === 0
                ? "Sin jugadores disponibles"
                : "Seleccionar jugador"}
            </option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {!loading && !error && players.length === 0 && (
            <p className="text-xs text-amber-600">
              No hay usuarios con rol <b>JUGADOR</b>. Agregá jugadores en “Usuarios”.
            </p>
          )}
          {error && (
            <p className="text-xs text-red-600">
              No se pudo cargar la lista ({String(error)}).
            </p>
          )}
        </div>

        {/* Campos demo (se habilitan al elegir jugador) */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Estado</label>
          <select
            className="h-10 w-full rounded-md border px-3 text-sm"
            disabled={!userId}
            defaultValue="LIMITADA"
          >
            <option value="ALTA">Alta</option>
            <option value="REINTEGRO">Reintegro</option>
            <option value="ACTIVO">Baja</option>
            <option value="LIMITADA">Limitada</option>
          </select>
          <p className="text-xs text-gray-500">
            (Campos demo — mañana enchufamos todo el flujo real.)
          </p>
        </div>

        <div className="pt-2">
          <button
            className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50"
            disabled={!userId}
            onClick={() => alert(`Guardado (demo) para userId=${userId}`)}
          >
            Guardar
          </button>
        </div>
      </section>
    </main>
  );
}
