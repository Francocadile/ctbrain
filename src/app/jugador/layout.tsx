// src/app/jugador/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { getPlayerName, clearPlayerName, setPlayerName } from "@/lib/player";

export default function JugadorLayout({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(getPlayerName());
  }, []);

  function handleLogout() {
    clearPlayerName();
    window.location.href = "/jugador";
  }

  function handleSet() {
    const n = prompt("Ingresá tu nombre (como te ve el CT):", getPlayerName() || "");
    if (n !== null) {
      setPlayerName(n);
      setName(getPlayerName());
    }
  }

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <div className="w-full border-b bg-white">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="text-sm font-medium">Jugador</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Soy: <strong>{name || "—"}</strong></span>
              <button onClick={handleSet} className="px-2 py-1 rounded border text-xs hover:bg-gray-50">
                Cambiar nombre
              </button>
              <button onClick={handleLogout} className="px-2 py-1 rounded border text-xs hover:bg-gray-50">
                Salir
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
