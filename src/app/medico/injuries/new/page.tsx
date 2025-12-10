"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import { todayYMD } from "@/hooks/useEpisodes";
import type { Episode } from "@/hooks/useEpisodes";

export default function MedInjuryNewPage() {
  // ⚠️ Requerido por Next.js cuando usamos useSearchParams en Client Components
  return (
    <Suspense
      fallback={
        <main className="min-h-[70vh] px-6 py-8">
          <div className="rounded-xl border bg-white p-5 text-gray-500">
            Cargando…
          </div>
        </main>
      }
    >
      <NewEpisodeInner />
    </Suspense>
  );
}

function NewEpisodeInner() {
  const router = useRouter();
  const search = useSearchParams();

  // Tomamos ?date=YYYY-MM-DD si viene; si no, hoy.
  const defaultDate = React.useMemo(() => {
    const qd = search?.get("date") || undefined;
    return qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? qd : todayYMD();
  }, [search]);

  const fromId = search?.get("from") || null;
  const [prefill, setPrefill] = React.useState<Partial<Episode> | null>(null);
  const [loading, setLoading] = React.useState<boolean>(!!fromId);
  const [err, setErr] = React.useState<string | null>(null);

  // Si viene ?from=<id>, traemos ese episodio y lo usamos como base (sin id)
  React.useEffect(() => {
    let active = true;
    async function loadFrom() {
      if (!fromId) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/medico/clinical/${encodeURIComponent(fromId)}`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Episode;

        if (!active) return;
        const base: Partial<Episode> = {
          // ⚠️ sin id → es un nuevo registro
          userId: data.userId,
          status: data.status,
          // copiamos campos clínicos
          leaveStage: data.leaveStage ?? null,
          leaveKind: data.leaveKind ?? null,
          diagnosis: data.diagnosis ?? null,
          bodyPart: data.bodyPart ?? null,
          laterality: data.laterality ?? null,
          mechanism: data.mechanism ?? null,
          severity: data.severity ?? null,
          illSystem: data.illSystem ?? null,
          illSymptoms: data.illSymptoms ?? null,
          illContagious: data.illContagious ?? null,
          illIsolationDays: data.illIsolationDays ?? null,
          illAptitude: data.illAptitude ?? null,
          feverMax: data.feverMax ?? null,
          // cronología: seteamos fecha y recomputamos ETR en el form si hace falta
          startDate: defaultDate,
          expectedReturn: null,
          expectedReturnManual: false,
          // restricciones
          capMinutes: data.capMinutes ?? null,
          noSprint: data.noSprint ?? false,
          noChangeOfDirection: data.noChangeOfDirection ?? false,
          gymOnly: data.gymOnly ?? false,
          noContact: data.noContact ?? false,
          // docs/plan
          notes: data.notes ?? null,
          medSignature: data.medSignature ?? null,
          protocolObjectives: data.protocolObjectives ?? null,
          protocolTasks: data.protocolTasks ?? null,
          protocolControls: data.protocolControls ?? null,
          protocolCriteria: data.protocolCriteria ?? null,
        };
        setPrefill(base);
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message || "No se pudo prellenar desde el episodio seleccionado.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFrom();
    return () => {
      active = false;
    };
  }, [fromId, defaultDate]);

  return (
    <main className="min-h-[70vh] px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nuevo episodio clínico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cargá el parte del día. El ETR se calcula automáticamente desde “Días
          estimados” (podés editarlo).
        </p>
        {fromId ? (
          <p className="mt-2 text-xs text-gray-500">
            Prefill desde parte <code>{fromId}</code>
          </p>
        ) : null}
      </header>

      {loading ? (
        <section className="rounded-xl border bg-white p-5 shadow-sm text-gray-500">
          Cargando prefill…
        </section>
      ) : err ? (
        <section className="rounded-xl border bg-white p-5 shadow-sm text-red-600">
          {err}
        </section>
      ) : (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <EpisodeForm
            initial={prefill ?? undefined}
            defaultDate={defaultDate}
            onCancel={() => router.push("/med/injuries")}
            onSaved={() => router.push("/med/injuries")}
          />
        </section>
      )}
    </main>
  );
}
