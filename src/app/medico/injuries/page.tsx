// src/app/med/injuries/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import HelpTip from "@/components/HelpTip";
import EpisodeList from "@/components/episodes/EpisodeList";
import BackToMedico from "@/components/ui/BackToMedico";

export default function MedInjuriesPage() {
  const router = useRouter();

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <BackToMedico />
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Parte clínico — Médico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vos editás; el CT lo ve en lectura con semáforo y ETR.{" "}
          <HelpTip text="Incluye lesión/enfermedad, cronología con ETR automático (editable), restricciones y plan semanal." />
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Atajo:{" "}
          <a
            href="/api/medico/users/players"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            ver jugadores (JSON)
          </a>
        </p>
      </header>

      {/* Lista del día + acciones */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <EpisodeList
          onNew={(d) => {
            const qs = d ? `?date=${encodeURIComponent(d)}` : "";
            router.push(`/med/injuries/new${qs}`);
          }}
          onEdit={(ep) => router.push(`/med/injuries/${ep.id}`)}
        />
      </section>
    </main>
  );
}
