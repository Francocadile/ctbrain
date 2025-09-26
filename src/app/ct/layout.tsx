// src/app/ct/layout.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next"; // typedRoutes

function NavItem({
  href,
  children,
  active,
  soon,
}: {
  href?: Route;
  children: React.ReactNode;
  active?: boolean;
  soon?: boolean;
}) {
  const base = "block rounded-md px-2 py-1.5 text-sm transition";
  const activeCls = active ? "bg-black text-white" : "hover:bg-gray-100";
  if (!href) {
    return (
      <span className={`${base} text-gray-400 cursor-not-allowed`}>
        {children} {soon && <small className="ml-1">PRONTO</small>}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} ${activeCls}`}>
      {children}
    </Link>
  );
}

export default function CTLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (prefix: string) =>
    pathname === prefix || pathname?.startsWith(prefix + "/");

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white p-3 space-y-3">
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          INICIO
        </div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem href={"/ct" satisfies Route} active={pathname === "/ct"}>
              Dashboard / Inicio rápido
            </NavItem>
          </li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          MONITOREO
        </div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem
              href={"/ct/metrics/wellness" satisfies Route}
              active={isActive("/ct/metrics/wellness")}
            >
              Wellness
            </NavItem>
          </li>

          {/* ÚNICO ítem para RPE unificado */}
          <li>
            <NavItem
              href={"/ct/metrics/RPE" satisfies Route}
              active={isActive("/ct/metrics/RPE")}
            >
              rpe
            </NavItem>
          </li>

          <li>
            <NavItem href={"/ct/injuries" as Route} active={isActive("/ct/injuries")}>
              Lesionados
            </NavItem>
          </li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          PLANIFICACIÓN
        </div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem
              href={"/ct/plan-semanal" satisfies Route}
              active={isActive("/ct/plan-semanal")}
            >
              Plan semanal (Editor)
            </NavItem>
          </li>
          <li>
            <NavItem href={"/ct/sessions" satisfies Route} active={isActive("/ct/sessions")}>
              Sesiones
            </NavItem>
          </li>
          <li>
            <NavItem href={"/ct/exercises" as Route} active={isActive("/ct/exercises")}>
              Ejercicios
            </NavItem>
          </li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          TÉCNICA
        </div>
        <ul className="space-y-0.5 mb-2">
          <li>
            <NavItem href={"/ct/rivales" as Route} active={isActive("/ct/rivales")}>
              Rivales / Plan de partido
            </NavItem>
          </li>
        </ul>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-3 md:p-4">{children}</main>
    </div>
  );
}
