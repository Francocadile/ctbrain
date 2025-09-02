// src/app/ct/layout.tsx
import * as React from "react";
import Link from "next/link";

// Puedes borrar esto si ya tenés Metadata global.
// export const metadata = { title: "CT · Panel" };

function NavItem({
  href,
  children,
  soon = false,
}: {
  href?: string;
  children: React.ReactNode;
  soon?: boolean;
}) {
  const className =
    "block rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition";
  if (soon) {
    return (
      <span className={`${className} text-gray-400 cursor-not-allowed`}>
        {children} <small className="ml-1">(pronto)</small>
      </span>
    );
  }
  return (
    <Link href={href || "#"} className={className}>
      {children}
    </Link>
  );
}

export default function CTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white p-3 space-y-3">
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          INICIO
        </div>
        <ul className="space-y-0.5 mb-2">
          <li><NavItem href="/ct/dashboard">Dashboard / Inicio rápido</NavItem></li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          MONITOREO
        </div>
        <ul className="space-y-0.5 mb-2">
          <li><NavItem href="/ct/metrics/wellness">Wellness (día)</NavItem></li>
          <li><NavItem href="/ct/metrics/rpe">RPE (día)</NavItem></li>
          <li><NavItem soon>Lesionados</NavItem></li>
        </ul>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          PLANIFICACIÓN
        </div>
        <ul className="space-y-0.5 mb-2">
          <li><NavItem href="/ct/sessions">Plan semanal (Editor)</NavItem></li>
        </ul>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-3 md:p-4">{children}</main>
    </div>
  );
}
