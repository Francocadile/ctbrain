// src/app/ct/layout.tsx
import * as React from "react";
import Link from "next/link";
import type { Route } from "next"; // ✅ typedRoutes

function NavItem({
  href,
  children,
  soon,
}: {
  href?: Route;
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
    <Link href={href} className="block rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition">
      {children}
    </Link>
  );
}

export default function CTLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white p-3 space-y-3">
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">INICIO</div>
        <ul className="space-y-0.5 mb-2">
          <li><NavItem href={"/ct" satisfies Route}>Dashboard / Inicio rápido</NavItem></li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">MONITOREO</div>
        <ul className="space-y-0.5 mb-2">
          <li><NavItem href={"/ct/wellness" satisfies Route}>Wellness (día)</NavItem></li>
          <li><NavItem href={"/ct/rpe" satisfies Route}>RPE (día)</NavItem></li>
          <li><NavItem soon>Lesionados</NavItem></li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">PLANIFICACIÓN</div>
        <ul className="space-y-0.5 mb-2">
          <li><NavItem href={"/ct/plan-semanal" satisfies Route}>Plan semanal (Editor)</NavItem></li>
          {/* 👇 Solo cambia el texto, el link ya apunta al listado */}
          <li><NavItem href={"/ct/sessions" satisfies Route}>Sesiones</NavItem></li>
        </ul>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-3 md:p-4">{children}</main>
    </div>
  );
}
