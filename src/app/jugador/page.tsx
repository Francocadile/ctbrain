// src/app/jugador/page.tsx
"use client";

import Link from "next/link";
import QuickActions from "@/components/jugador/QuickActions";

  return (
    <div className="space-y-6">
      <QuickActions />
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/jugador/wellness"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Wellness diario</h2>
          <p className="text-sm text-gray-600">Sueño, fatiga, dolor muscular, estrés, ánimo (+ horas de sueño).</p>
        </Link>
        <Link
          href="/jugador/rpe"
          className="rounded-2xl border bg-white p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">RPE post-entrenamiento</h2>
          <p className="text-sm text-gray-600">RPE 0–10. La duración la completa el CT.</p>
        </Link>
      </div>
    </div>
  );
}
