"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CtHome() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Panel — Cuerpo Técnico</h2>
      <p className="text-white/70">
        Hola {session?.user?.name || session?.user?.email}, este será tu panel operativo.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="mb-2 font-medium">Planificación semanal</h3>
          <p className="text-sm text-white/70">Crea y organiza sesiones de la semana.</p>
          <div className="pt-3">
            <button className="rounded-2xl bg-brand-500 px-3 py-1.5 text-sm hover:bg-brand-600">
              Ir a Planificación
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="mb-2 font-medium">Ejercicios</h3>
          <p className="text-sm text-white/70">Biblioteca de ejercicios reutilizables.</p>
          <div className="pt-3">
            <button className="rounded-2xl bg-brand-500 px-3 py-1.5 text-sm hover:bg-brand-600">
              Ver ejercicios
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-white/50">
        Accesos útiles:{" "}
        <Link className="underline hover:text-white/80" href="/admin">
          Admin
        </Link>
        {" · "}
        <Link className="underline hover:text-white/80" href="/login?logout=1">
          Cerrar sesión
        </Link>
      </div>
    </div>
  );
}
