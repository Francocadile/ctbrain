// src/app/jugador/page.tsx
"use client";

export default function JugadorHome() {
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-xl font-bold">Jugador — Panel</h1>
        <p className="text-sm text-gray-600">
          Completá tu Wellness diario y tu RPE post-entrenamiento.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <a
          href="/jugador/wellness"
          className="rounded-2xl border p-4 hover:bg-gray-50 block"
        >
          <div className="text-lg font-semibold">Wellness diario</div>
          <div className="text-sm text-gray-500">
            Sueño, fatiga, dolor muscular, estrés, ánimo (+ horas de sueño).
          </div>
        </a>

        <a
          href="/jugador/rpe"
          className="rounded-2xl border p-4 hover:bg-gray-50 block"
        >
          <div className="text-lg font-semibold">RPE post-entrenamiento</div>
          <div className="text-sm text-gray-500">
            Escala 0–10. Duración la completa el CT (opcional si la sabés).
          </div>
        </a>
      </div>

      <div className="pt-2">
        <a
          href="/ct/dashboard"
          className="inline-block rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          ← Ir al dashboard del CT
        </a>
      </div>
    </div>
  );
}
