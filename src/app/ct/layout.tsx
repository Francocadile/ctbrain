// src/app/ct/layout.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { signOut } from "next-auth/react";
import TeamSwitcher from "@/components/nav/TeamSwitcher";

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

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Header mobile (solo en sm) */}
      <header className="md:hidden border-b bg-white px-3 py-2 flex items-center justify-between gap-2">
        <TeamSwitcher className="max-w-[65%]" />
        <button
          type="button"
          className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰ Menú
        </button>
      </header>

      {/* Fondo oscuro cuando el menú está abierto (solo mobile) */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-r p-3 space-y-3 w-64 shrink-0 z-40 ${
          menuOpen ? "fixed inset-y-0 left-0 md:static md:block" : "hidden md:block"
        }`}
      >
        <TeamSwitcher className="w-full" />
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
          <li>
            <NavItem
              href={"/ct/metrics/rpe" satisfies Route}
              active={isActive("/ct/metrics/rpe")}
            >
              Rpe
            </NavItem>
          </li>
          <li>
            <NavItem href={"/ct/injuries" as Route} active={isActive("/ct/injuries")}>
              Lesionados
            </NavItem>
          </li>
              <li>
                <NavItem
                  href={"/ct/plantel" as Route}
                  active={isActive("/ct/plantel")}
                >
                  Plantel
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
          <li>
            <NavItem href={"/ct/rutinas" as Route} active={isActive("/ct/rutinas")}>
              Rutinas
            </NavItem>
          </li>
          <li>
            <NavItem href={"/ct/rival" as Route} active={isActive("/ct/rival")}>
              Rival
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
          <li>
            <NavItem href={"/ct/scouting" as Route} active={isActive("/ct/scouting")}>
              Scouting
            </NavItem>
          </li>
        </ul>

        {/* SALIR */}
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          SALIR
        </div>
        <ul className="space-y-0.5">
          <li>
            <button
              aria-label="Cerrar sesión"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left rounded-md px-2 py-1.5 text-sm transition hover:bg-gray-100"
            >
              Cerrar sesión
            </button>
          </li>
        </ul>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-3 md:p-4">{children}</main>
    </div>
  );
}
