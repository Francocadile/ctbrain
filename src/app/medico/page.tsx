"use client";
export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function MedicoHome() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Panel — Cuerpo Médico</h2>
      <p className="text-white/70">
        Hola {session?.user?.name || session?.user?.email}, aquí verás wellness, RPE y alertas.
      </p>

      <div className="rounded-xl border border-white/10 p-4">
        <h3 className="mb-2 font-medium">Resumen diario</h3>
        <p className="text-sm text-white/70">
          Próximamente: listado de jugadores con indicadores de riesgo.
        </p>
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
