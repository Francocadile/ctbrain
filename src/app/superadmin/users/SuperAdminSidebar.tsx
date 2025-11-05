"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function SuperAdminSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r bg-white p-3 space-y-3">
      <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">SUPERADMIN</div>
      <ul className="space-y-0.5 mb-2">
        <li>
          <Link href="/superadmin/users" className="block rounded-md px-2 py-1.5 text-sm transition bg-black text-white">Usuarios</Link>
        </li>
        <li>
          <Link href="/superadmin/teams" className="block rounded-md px-2 py-1.5 text-sm transition hover:bg-gray-100">Equipos</Link>
        </li>
      </ul>
      <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">SALIR</div>
      <ul className="space-y-0.5">
        <li>
          <button
            aria-label="Cerrar sesión"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full text-left rounded-md px-2 py-1.5 text-sm transition hover:bg-gray-100"
          >Cerrar sesión</button>
        </li>
      </ul>
    </aside>
  );
}
