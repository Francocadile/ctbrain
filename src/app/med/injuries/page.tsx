// src/app/med/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import HelpTip from "@/components/HelpTip";
import EpisodeList from "@/components/episodes/EpisodeList";
import EpisodeForm from "@/components/episodes/EpisodeForm";

export default function MedInjuriesPage() {
  const [open, setOpen] = React.useState(false);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>(undefined);

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Parte clínico — Médico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestioná episodios del día: alta/baja/limitada/reintegro, ETR y restricciones.{" "}
          <HelpTip text="El CT ve todo en lectura con semáforo y ETR." />
        </p>
      </header>

      {/* Lista del día con acciones */}
      <EpisodeList
        onNew={(d) => {
          setDefaultDate(d);
          setOpen(true);
        }}
        onEdit={(ep) => {
          // Usamos la pantalla dedicada de edición
          window.location.href = `/med/injuries/${ep.id}`;
        }}
      />

      {/* Modal simple para crear nuevo episodio */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            role="button"
            aria-label="Cerrar modal"
          />
          <div className="relative z-10 w-full max-w-3xl rounded-xl border bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo episodio</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
            <EpisodeForm
              defaultDate={defaultDate}
              onCancel={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                // La lista se recarga sola porque EpisodeForm llama a saveEpisode() que hace reload
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
