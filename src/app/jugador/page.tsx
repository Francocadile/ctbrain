// src/app/jugador/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlayerName, setPlayerName } from "@/lib/player";

export default function JugadorPanel() {
  const [name, setNameState] = useState("");

  useEffect(() => {
    const n = getPlayerName();
    if (!n) {
      const picked = prompt("Ingresá tu nombre (como te ve el CT):") || "";
      if (picked.trim()) setPlayerName(picked.trim());
    }
    setNameState(getPlayerName());
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">Jugador — Panel</h1>
      <p className="text-sm text-gray-600 mb-4">
        Completá tu Wellness diario y tu RPE post-entrenamiento.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/jugador/wellness" className="block rounded-xl border bg-white p-4 hover:bg-gray-50">
          <div className="font-semibold">Wellness diario</div>
          <div className="text-sm text-gray-500">Sueño, fatiga, dolor muscular, estrés, ánimo (+ horas de sueño).</div>
        </Link>
        <Link href="/jugador/rpe" className="block rounded-xl border bg-white p-4 hover:bg-gray-50">
          <div className="font-semibold">RPE post-entrenamiento</div>
          <div className="text-sm text-gray-500">
            Escala 0–10. <strong>La duración la completa el CT</strong>.
          </div>
        </Link>
      </div>
    </div>
  );
}
