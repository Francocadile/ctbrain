"use client";

import { useState } from "react";

export default function BuscarSesionesPage() {
  const [q, setQ] = useState("");

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Buscar en sesiones</h1>
      <p className="text-sm text-gray-600">
        Próximamente: buscador real sobre tus sesiones. Por ahora, usá el editor semanal o abrí una sesión específica.
      </p>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe para buscar (placeholder)"
          className="border rounded-lg px-3 py-2 text-sm w-full"
        />
        <a
          href="/ct/sessions"
          className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          Ir a sesiones
        </a>
      </div>
    </div>
  );
}
