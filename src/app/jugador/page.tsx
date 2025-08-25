"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function JugadorHome() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Panel — Jugador</h2>
      <p className="text-white/70">
        Hola {session?.user?.name || session?.user?.email}, aquí vas a completar tu Wellness y RPE.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="mb-2 font-medium">Wellness (pre)</h3>
          <p className="text-sm text-white/70">Formulario diario de bienestar.</p>
          <div className="pt-3">
            <button className="rounded-2xl bg-brand-500 px-3 py-1.5 text-sm hover:bg-brand-600">
              Completar wellness
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="mb-2 font-medium">RPE (post)</h3>
          <p className="text-sm text-white/70">Carga subjetiva después de la sesión.</p>
          <div className="pt-3">
            <button className="rounded-2xl bg-brand-500 px-3 py-1.5 text-sm hover:bg-brand-600">
              Enviar RPE
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-white/50">
        Accesos útiles:{" "}
        <Link className="underline hover:text-white/80" href="/login?logout=1">
          Cerrar sesión
        </Link>
      </div>
    </div>
  );
}
