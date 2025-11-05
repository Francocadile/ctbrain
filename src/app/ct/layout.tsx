"use client";
// src/app/ct/layout.tsx
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import prisma from "@/lib/prisma";

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

  const [colors, setColors] = useState<{ primary: string; secondary: string }>({ primary: "#000000", secondary: "#ffffff" });

  useEffect(() => {
    async function fetchColors() {
      const session = await getSession();
  const teamId = (session?.user as any)?.teamId;
      if (teamId) {
        // Fetch team colors from API
        const res = await fetch(`/api/team/${teamId}`);
        if (res.ok) {
          const team = await res.json();
          setColors({
            primary: team.primaryColor || "#000000",
            secondary: team.secondaryColor || "#ffffff",
          });
        }
      }
    }
    fetchColors();
  }, []);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: colors.secondary }}>
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
        {/* ...existing code... */}
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
          SALIR
        </div>
        <ul className="space-y-0.5">
          <li>
            <button
              aria-label="Cerrar sesión"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left rounded-md px-2 py-1.5 text-sm transition"
              style={{ backgroundColor: colors.primary, color: colors.secondary }}
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
