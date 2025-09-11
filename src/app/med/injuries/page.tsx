// src/app/med/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useRouter } from "next/navigation";
import HelpTip from "@/components/HelpTip";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import EpisodeList from "@/components/episodes/EpisodeList";

type Tab = "list" | "new";

export default function MedInjuriesPage() {
  const [tab, setTab] = React.useState<Tab>("list");
  const router = useRouter();

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Parte clínico — Médico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vos editás; el CT lo ve en lectura con semáforo y ETR.{" "}
          <HelpTip text="Incluye lesión/enfermedad, ETR automático (editable), restricciones y plan semanal." />
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`h-9 rounded-md border px-3 text-sm ${tab === "list" ? "bg-black text-white" : "bg-white"}`}
        >
          Listado
        </button>
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`h-9 rounded-md border px-3 text-sm ${tab === "new" ? "bg-black text-white" : "bg-white"}`}
        >
          Nuevo
        </button>
        <div className="ml-auto text-xs text-gray-500">
          Atajo:{" "}
          <a
            href="/api/med/users/players"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            ver jugadores (JSON)
          </a>
        </div>
      </div>

      {tab === "list" ? (
        <EpisodeList
          onNew={() => setTab("new")}
          onEdit={(ep) => router.push(`/med/injuries/${ep.id}`)}
          className="shadow-sm"
        />
      ) : (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <EpisodeForm
            onSaved={() => setTab("list")}
            onCancel={() => setTab("list")}
          />
        </section>
      )}
    </main>
  );
}
