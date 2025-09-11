// src/app/med/injuries/new/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import { todayYMD } from "@/hooks/useEpisodes";

export default function MedInjuryNewPage() {
  const router = useRouter();
  const search = useSearchParams();

  // Tomamos ?date=YYYY-MM-DD si viene; si no, hoy.
  const defaultDate = React.useMemo(() => {
    const qd = search?.get("date") || undefined;
    return qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? qd : todayYMD();
  }, [search]);

  return (
    <main className="min-h-[70vh] px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nuevo episodio clínico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cargá el parte del día. El ETR se calcula automáticamente desde “Días estimados” (podés editarlo).
        </p>
      </header>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <EpisodeForm
          defaultDate={defaultDate}
          onCancel={() => router.push("/med/injuries")}
          onSaved={() => router.push("/med/injuries")}
        />
      </section>
    </main>
  );
}
