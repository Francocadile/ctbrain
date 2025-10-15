"use client";

import Link from "next/link";

type Item = { label: string; href: string; desc: string; aria: string };

const items: Item[] = [
  { label: "Sesión del día", href: "/jugador", desc: "Ver la sesión asignada para hoy", aria: "Ir a sesión del día" },
  { label: "Wellness", href: "/jugador/wellness", desc: "Responder cuestionario de bienestar", aria: "Ir a wellness del jugador" },
  { label: "RPE", href: "/jugador/rpe", desc: "Registrar el esfuerzo percibido (post)", aria: "Ir a RPE del jugador" },
  { label: "Planificación semanal", href: "/jugador/plan-semanal", desc: "Ver sesiones de la semana (solo lectura)", aria: "Ir a planificación semanal del jugador" },
];

export default function QuickActions() {
  return (
    <section aria-label="Accesos rápidos del jugador" className="w-full">
      <div className="mb-2">
        <h2 className="text-xl font-semibold">Accesos rápidos</h2>
        <p className="text-sm text-muted-foreground">Entrá directo a tus acciones más usadas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-label={it.aria}
            className="group block rounded-xl border bg-background p-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <div className="flex flex-col">
              <span className="text-base font-medium group-hover:underline">{it.label}</span>
              <span className="text-xs text-muted-foreground mt-1">{it.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
