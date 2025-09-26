"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import type { Episode } from "@/hooks/useEpisodes";

export default function MedEpisodeEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [initial, setInitial] = React.useState<Partial<Episode> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/med/clinical/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Episode;
        if (!active) return;
        setInitial(data);
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message || "No se pudo cargar el episodio.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="min-h-[70vh] px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Editar episodio clínico</h1>
          <p className="mt-1 text-sm text-gray-600">
            Actualizá estado, ETR, restricciones o plan. El CT lo verá en lectura.
          </p>
        </div>

        {/* Acciones de cabecera */}
        {!loading && !err && initial ? (
          <div className="flex gap-2">
            <button
              className="h-9 rounded-md border px-3 text-sm"
              onClick={() => router.push(`/med/injuries/new?from=${encodeURIComponent(String(id))}`)}
              title="Crea un nuevo parte con estos datos como base (fecha y estado podés ajustarlos)."
            >
              Duplicar como nuevo
            </button>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="rounded-xl border bg-white p-5 text-gray-500">Cargando…</div>
      ) : err ? (
        <div className="rounded-xl border bg-white p-5 text-red-600">
          Error: {err}
          <div className="mt-3">
            <button
              className="h-9 rounded-md border px-3 text-sm"
              onClick={() => router.back()}
            >
              Volver
            </button>
          </div>
        </div>
      ) : initial ? (
        <section className="rounded-xl border bg-white p-5">
          <EpisodeForm
            initial={initial}
            defaultDate={initial.date}
            onCancel={() => router.back()}
            onSaved={() => router.push("/med/injuries")}
          />
        </section>
      ) : (
        <div className="rounded-xl border bg-white p-5 text-gray-500">
          No se encontró el episodio.
        </div>
      )}
    </main>
  );
}
