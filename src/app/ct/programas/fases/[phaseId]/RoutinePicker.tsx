"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type RoutineHit = { id: string; title: string };

export default function RoutinePicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (routineId: string) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RoutineHit[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setError(null);
        const res = await fetch(`/api/ct/routines/search?q=${encodeURIComponent(q)}`, {
          method: "GET",
          signal: ac.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Error buscando rutinas");
        setHits(Array.isArray(json?.routines) ? json.routines : []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Error");
      }
    })();

    return () => ac.abort();
  }, [open, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-sm font-medium">Agregar rutina</div>
            <div className="text-xs text-muted-foreground">Buscá por nombre (mínimo 2 letras)</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border bg-background px-3 py-1 text-sm hover:bg-muted"
          >
            Cerrar
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Fuerza tren inferior"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            autoFocus
          />

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="max-h-72 overflow-auto rounded-md border">
            {canSearch && hits.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
            ) : null}

            {hits.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await onSelect(r.id);
                      onClose();
                    } catch (e: any) {
                      setError(e?.message || "No se pudo agregar");
                    }
                  });
                }}
                className="block w-full text-left p-3 hover:bg-muted disabled:opacity-60"
              >
                <div className="text-sm font-medium">{r.title}</div>
              </button>
            ))}

            {!canSearch ? <div className="p-3 text-sm text-muted-foreground">Escribí para buscar…</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
