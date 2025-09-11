// src/app/med/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useRouter } from "next/navigation";
import HelpTip from "@/components/HelpTip";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import EpisodeList from "@/components/episodes/EpisodeList";

type Tab = "nuevo" | "lista";

export default function MedInjuriesPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("nuevo");
  const [formDefaultDate, setFormDefaultDate] = React.useState<string | undefined>(undefined);

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-4">
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

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          className={`rounded-md px-3 py-2 text-sm ring-1 ${
            tab === "nuevo"
              ? "bg-black text-white ring-black"
              : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
          }`}
          onClick={() => setTab("nuevo")}
        >
          Nuevo
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ring-1 ${
            tab === "lista"
              ? "bg-black text-white ring-black"
              : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
          }`}
          onClick={() => setTab("lista")}
        >
          Lista del día
        </button>
      </div>

      {tab === "nuevo" ? (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <EpisodeForm
            defaultDate={formDefaultDate}
            onSaved={() => setTab("lista")}
          />
        </section>
      ) : (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <EpisodeList
            onNew={(d) => {
              setFormDefaultDate(d);
              setTab("nuevo");
            }}
            onEdit={(ep) => router.push(`/med/injuries/${ep.id}`)}
          />
        </section>
      )}
    </main>
  );
}
