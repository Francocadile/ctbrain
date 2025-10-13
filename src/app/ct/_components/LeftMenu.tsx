// src/app/ct/_components/LeftMenu.tsx
"use client";

import { signOut } from "next-auth/react";
import MenuLink from "./MenuLink";

export default function LeftMenu() {
  return (
    <nav className="p-3 space-y-4">
      {/* INICIO */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">INICIO</div>
        <MenuLink href="/ct/dashboard">Dashboard / Inicio rápido</MenuLink>
      </div>

      {/* MONITOREO */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">MONITOREO</div>
        <MenuLink href="/ct/metrics/wellness">Wellness</MenuLink>
        <MenuLink href="/ct/metrics/rpe">Rpe</MenuLink>
        <MenuLink soon>Lesionados</MenuLink>
      </div>

      {/* PLANIFICACIÓN */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">PLANIFICACIÓN</div>
        <MenuLink href="/ct/sessions/editor">Plan semanal (Editor)</MenuLink>
        <MenuLink soon>Sesiones</MenuLink>
        <MenuLink soon>Ejercicios</MenuLink>
  <MenuLink href="/ct/rutinas">Rutinas de fuerza</MenuLink>
  <MenuLink href="/ct/rutinas">Planificador de rutinas</MenuLink>
        <MenuLink href="/ct/videos">Videos DT</MenuLink>
        <MenuLink href="/ct/share">Material compartido</MenuLink>
        <MenuLink href="/ct/seguimiento">Seguimiento de lectura</MenuLink>
      </div>

      {/* TÉCNICA */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">TÉCNICA</div>
        <MenuLink soon>Rivales / Plan de partido</MenuLink>
        <MenuLink soon>Scouting</MenuLink>
      </div>

      {/* SALIR */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">SALIR</div>
        <button
          onClick={() => signOut()}
          className="w-full text-left block rounded-md px-3 py-1.5 text-[13px] text-gray-800 hover:bg-gray-100"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
