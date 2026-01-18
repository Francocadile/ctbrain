// src/app/ct/_components/LeftMenu.tsx
"use client";

import { signOut } from "next-auth/react";
import MenuLink from "./MenuLink";

export default function LeftMenu() {
  return (
    <nav className="p-3 space-y-4">
      {/* INICIO */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
          Inicio
        </div>
        <MenuLink href="/ct/dashboard">Dashboard / Inicio rápido</MenuLink>
      </div>

      {/* PLANIFICACIÓN */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
          Planificación
        </div>
        <MenuLink href="/ct/sessions/editor">Plan semanal (Editor)</MenuLink>
        <MenuLink soon>Sesiones y Ejercicios (almacén)</MenuLink>
        <MenuLink soon>Plan de partido (Rivales & Videos)</MenuLink>
        <MenuLink href="/ct/proximo-rival">Próximo rival</MenuLink>
        <MenuLink soon>Videos propios (colectivo / individual)</MenuLink>
        <MenuLink soon>Calendario general / Competencia</MenuLink>
      </div>

      {/* MONITOREO */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
          Monitoreo
        </div>
        <MenuLink soon>Carga semanal (planificado vs ejecutado)</MenuLink>
        <MenuLink soon>Rendimiento (colectivo / individual)</MenuLink>
        {/* NUEVOS LINKS ACTIVOS */}
        <MenuLink href="/ct/metrics/wellness">Wellness (día)</MenuLink>
        <MenuLink href="/ct/metrics/rpe">RPE (día)</MenuLink>
        <MenuLink soon>Lesionados</MenuLink>
      </div>

      {/* PERSONAS & RECURSOS */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
          Personas & Recursos
        </div>
        <MenuLink soon>Jugadores (ficha integral)</MenuLink>
        <MenuLink soon>Biblioteca / Recursos compartidos</MenuLink>
        <MenuLink soon>Notas / Bitácora del CT</MenuLink>
      </div>

      {/* SALIR */}
      <div>
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
          Salir
        </div>
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
