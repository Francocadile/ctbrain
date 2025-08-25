"use client";
export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DirectivoHome() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Panel — Directivo</h2>
      <p className="text-white/70">
        Hola {session?.user?.name || session?.user?.email}, verás reportes de asistencia y cargas.
      </p>

      <div className="rounded-xl border border-white/10 p-4">
        <h3 className="mb-2 font-medium">KPIs</h3>
        <ul className="list-disc pl-5 text-sm text-white/70">
          <li>Asistencia semanal (%)</li>
          <li>RPE promedio por sesión/semana</li>
          <li>Wellness medio por dimensión</li>
        </ul>
        <div className="pt-3">
          <button className="rounded-2xl bg-brand-500 px-3 py-1.5 text-sm hover:bg-brand-600">
            Ver reportes
          </button>
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
