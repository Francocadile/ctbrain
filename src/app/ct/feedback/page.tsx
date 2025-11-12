"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type FeedbackEntry = {
  id: string;
  playerId: string;
  playerName: string;
  subject: string | null;
  text: string;
  rating: number | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
};

type FetchState = "idle" | "loading" | "ready" | "error";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function CtFeedbackPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/login");
    },
  });

  const role = session?.user?.role;
  const isAllowed = role === "CT" || role === "MEDICO" || role === "ADMIN";

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const loadEntries = async (signal?: AbortSignal) => {
    if (!isAllowed) return;
    setFetchState("loading");
    setError(null);

    const params = new URLSearchParams();
    if (playerFilter !== "all") params.set("playerId", playerFilter);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());

    try {
      const url = params.size ? `/api/feedback?${params.toString()}` : "/api/feedback";
      const res = await fetch(url, { cache: "no-store", signal });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error || "No se pudo cargar el feedback");
      }
      const payload = (await res.json()) as { data: FeedbackEntry[] };
      setEntries(payload.data || []);
      setFetchState("ready");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("[feedback] fetch failed", err);
      setFetchState("error");
      setError(err?.message || "No se pudo cargar el feedback");
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isAllowed) return;
    const controller = new AbortController();
    loadEntries(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAllowed, playerFilter, from, to]);

  if (status === "loading") {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  }

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-6 text-sm text-gray-600">
        No tenés permiso para ver el feedback de los jugadores.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Feedback de jugadores</h1>
        <p className="text-sm text-gray-600">
          Consultá los mensajes que los jugadores enviaron al cuerpo técnico o staff médico.
        </p>
      </header>

      <Filters
        entries={entries}
        playerFilter={playerFilter}
        onPlayerChange={setPlayerFilter}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onClear={() => {
          setPlayerFilter("all");
          setFrom("");
          setTo("");
        }}
        onRefresh={() => loadEntries()}
        loading={fetchState === "loading"}
      />

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <FeedbackTable entries={entries} loading={fetchState === "loading" && !entries.length} />
    </div>
  );
}

type FiltersProps = {
  entries: FeedbackEntry[];
  playerFilter: string;
  onPlayerChange: (value: string) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
};

function Filters({
  entries,
  playerFilter,
  onPlayerChange,
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  onRefresh,
  loading,
}: FiltersProps) {
  const playerOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const entry of entries) {
      if (!unique.has(entry.playerId)) {
        unique.set(entry.playerId, entry.playerName);
      }
    }
    return Array.from(unique.entries());
  }, [entries]);

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm text-gray-700">
          Jugador
          <select
            value={playerFilter}
            onChange={(evt) => onPlayerChange(evt.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="all">Todos</option>
            {playerOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-gray-700">
          Desde
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(evt) => onFromChange(evt.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm text-gray-700">
          Hasta
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(evt) => onToChange(evt.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Limpiar
          </button>
        </div>
      </div>
    </section>
  );
}

type TableProps = {
  entries: FeedbackEntry[];
  loading: boolean;
};

function FeedbackTable({ entries, loading }: TableProps) {
  if (!entries.length) {
    return (
      <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-gray-500">
        {loading ? "Cargando feedback…" : "Todavía no hay mensajes registrados."}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Jugador</th>
            <th className="px-4 py-3 text-left">Tema</th>
            <th className="px-4 py-3 text-left">Mensaje</th>
            <th className="px-4 py-3 text-left">Valoración</th>
            <th className="px-4 py-3 text-left">Enviado por</th>
            <th className="px-4 py-3 text-left">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top">
              <td className="px-4 py-3 font-medium text-gray-900">{entry.playerName}</td>
              <td className="px-4 py-3 text-gray-700">{entry.subject ?? "—"}</td>
              <td className="px-4 py-3 text-gray-700">
                <p className="whitespace-pre-line text-sm leading-5 text-gray-700">{entry.text}</p>
              </td>
              <td className="px-4 py-3 text-gray-700">
                {entry.rating ? `${entry.rating}/5` : <span className="text-gray-400">Sin dato</span>}
              </td>
              <td className="px-4 py-3 text-gray-700">{entry.createdByName}</td>
              <td className="px-4 py-3 text-gray-600">{formatCreatedAt(entry.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatCreatedAt(value: string) {
  try {
    return dateFormatter.format(new Date(value));
  } catch (err) {
    return value;
  }
}
