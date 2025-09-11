// src/app/med/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import HelpTip from "@/components/HelpTip";
import EpisodeForm from "@/components/episodes/EpisodeForm";

export default function MedInjuriesPage() {
  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Parte clínico — Médico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vos editás; el CT lo ve en lectura con semáforo y ETR.{" "}
          <HelpTip text="Incluye lesión/enfermedad, cronología con ETR automático (editable), restricciones y plan semanal." />
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Atajo:{" "}
          <a
            href="/api/med/users/players"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            ver jugadores (JSON)
          </a>
        </p>
      </header>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        {/* 🚀 Formulario nuevo con todas las mejoras */}
        <EpisodeForm />
      </section>
    </main>
  );
}
