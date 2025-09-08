"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Player = { id: string; label: string };
type InjuryRow = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: string;
  bodyPart: string | null;
  availability: string;
  pain: number | null;
  capMinutes: number | null;
  noSprint: boolean;
  noChangeOfDirection: boolean;
  gymOnly: boolean;
  noContact: boolean;
  laterality: string | null;
  mechanism: string | null;
  severity: string | null;
  expectedReturn: string | null; // YYYY-MM-DD | null
};

const STATUSES = ["Activo", "Reintegro", "Alta"] as const;
const BODYPARTS = [
  "Isquiotibiales",
  "Cuádriceps",
  "Adductores",
  "Tobillo",
  "Rodilla",
  "Espalda",
  "Hombro",
  "Otra",
] as const;

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function InjuriesPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const today = React.useMemo(() => new Date(), []);
  const [date, setDate] = React.useState<string>(
    sp.get("date") ?? formatDate(today)
  );

  // Alta rápida
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [playerId, setPlayerId] = React.useState("");
  const [status, setStatus] = React.useState<(typeof STATUSES)[number]>("Activo");
  const [bodyPart, setBodyPart] =
    React.useState<(typeof BODYPARTS)[number]>("Isquiotibiales");

  // Data del día
  const [rows, setRows] = React.useState<InjuryRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Ayuda (?)
  const [showHelp, setShowHelp] = React.useState(false);

  // Cargar jugadores para el selector
  React.useEffect(() => {
    fetch("/api/users/players")
      .then((r) => r.json())
      .then((data) =>
        setPlayers(
          data.map((p: any) => ({
            id: p.id,
            label: p.name ?? p.email ?? "Sin nombre",
          }))
        )
      )
      .catch(() => setPlayers([]));
  }, []);

  // Cargar entradas del día
  const loadDay = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/injuries?date=${date}`, { cache: "no-store" });
      const data: InjuryRow[] = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    // mantener la fecha en la URL para copiar/pegar
    const url = `/ct/injuries?date=${date}`;
    router.replace(url);
    loadDay();
  }, [date, router, loadDay]);

  async function onSave() {
    if (!playerId) {
      alert("Elegí un jugador.");
      return;
    }
    try {
      const res = await fetch("/api/injuries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: playerId, // 👈 ID real del jugador
          date,
          status,
          bodyPart,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "Error creando entrada");
        return;
      }
      setPlayerId("");
      setStatus("Activo");
      setBodyPart("Isquiotibiales");
      await loadDay();
    } catch (e) {
      alert("Error creando entrada");
    }
  }

  const activos = rows.filter((r) => r.status === "Activo").length;
  const reintegro = rows.filter((r) => r.status === "Reintegro").length;
  const altasHoy = rows.filter((r) => r.status === "Alta").length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Lesionados — Diario</h1>
        {/* Botón (?) ayuda */}
        <button
          aria-label="Ayuda"
          onClick={() => setShowHelp((s) => !s)}
          className="h-6 w-6 rounded-full border text-xs font-bold"
          title="Qué es esta pantalla"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <div className="mt-3 text-sm rounded-md border p-3 bg-white">
          <p className="mb-1">
            Esta vista permite registrar el <strong>estado diario</strong> de cada
            jugador (Activo, Reintegro, Alta) y una zona corporal.
          </p>
          <ul className="list-disc ml-5">
            <li>Usá “Alta rápida” para cargar una entrada básica del día.</li>
            <li>
              Los **planes/restricciones** se completan luego en el perfil del
              jugador.
            </li>
            <li>
              El **valor del jugador** se guarda por <strong>ID</strong>, no por
              nombre.
            </li>
          </ul>
        </div>
      )}

      {/* Filtros / fecha */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="date"
          className="rounded-md border px-2 py-1.5 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          onClick={loadDay}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          Recargar
        </button>
        <a
          className="ml-auto rounded-md border px-3 py-1.5 text-sm"
          href={`/api/injuries/export?date=${date}`}
        >
          Exportar CSV
        </a>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiCard label="ACTIVOS" value={activos} />
        <KpiCard label="REINTEGRO" value={reintegro} />
        <KpiCard label="ALTAS HOY" value={altasHoy} />
        <KpiCard label="ENTRADAS ÚLTIMOS 30D" value={rows.length} />
      </div>

      {/* Alta rápida */}
      <div className="mt-5 rounded-md border bg-white p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">Alta rápida</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            className="rounded-md border px-2 py-1.5 text-sm"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">Elegí un jugador…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border px-2 py-1.5 text-sm"
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value as any)}
          >
            {BODYPARTS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={onSave}
            className="rounded-md bg-black text-white px-3 py-1.5 text-sm"
          >
            Guardar
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          * Luego podés completar detalles y restricciones.
        </p>
      </div>

      {/* Entradas del día */}
      <div className="mt-5 rounded-md border bg-white">
        <div className="border-b px-3 py-2 text-sm font-medium">
          ENTRADAS DEL DÍA
        </div>
        <div className="p-3">
          {loading ? (
            <div className="text-sm text-gray-500">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-500">Sin datos</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1.5">Jugador</th>
                  <th className="py-1.5">Fecha</th>
                  <th className="py-1.5">Estado</th>
                  <th className="py-1.5">Zona</th>
                  <th className="py-1.5">Dispon.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1.5">{r.userName}</td>
                    <td className="py-1.5">{r.date}</td>
                    <td className="py-1.5">{r.status}</td>
                    <td className="py-1.5">{r.bodyPart ?? "—"}</td>
                    <td className="py-1.5">{r.availability ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3 text-[11px] text-gray-600">
        <strong>Disponibilidad:</strong> OUT (no entrena), MODIFIED (restricciones
        activas), FULL (sin restricciones). <strong>Restricciones:</strong> cap de
        minutos y flags operativos para que el CT los use en Plan y RPE.
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
