// src/app/ct/layout.tsx
import * as React from "react";
import Link from "next/link";
import type { Route } from "next"; // ✅ typedRoutes

function NavItem({
  href,
  children,
  soon,
}: {
  href?: Route;                 // ✅ Link tipado
  children: React.ReactNode;
  soon?: boolean;
}) {
  if (!href) {
    return (
      <span className="block rounded-md px-2 py-1.5 text-sm text-gray-400 cursor-not-allowed">
        {children} {soon && <small className="ml-1">PRONTO</small>}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition"
    >
      {children}
    </Link>
  );
}

export default function CTLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white p-3 space-y-3">
        {/* INICIO */}
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">INICIO</div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem href={"/ct" satisfies Route}>
              Dashboard / Inicio rápido
            </NavItem>
          </li>
        </ul>

        {/* MONITOREO */}
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">MONITOREO</div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem href={"/ct/metrics/wellness" satisfies Route}>
              Wellness (día)
            </NavItem>
          </li>
          <li>
            <NavItem href={"/ct/metrics/rpe" satisfies Route}>
              RPE (día)
            </NavItem>
          </li>
          <li>
            <NavItem soon>Lesionados</NavItem>
          </li>
        </ul>

        {/* PLANIFICACIÓN */}
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">PLANIFICACIÓN</div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem href={"/ct/plan-semanal" satisfies Route}>
              Plan semanal (Editor)
            </NavItem>
          </li>
          <li>
            <NavItem soon>Sesiones y ejercicios</NavItem>
          </li>
        </ul>

        {/* SALIR */}
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">SALIR</div>
        <ul className="space-y-0.5">
          <li>
            <a
              href="/api/auth/signout?callbackUrl=/ct"
              className="block rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition"
            >
              Cerrar sesión
            </a>
          </li>
        </ul>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-3 md:p-4">{children}</main>
    </div>
  );
}
