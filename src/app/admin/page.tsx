"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AdminPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Panel — Admin</h2>
      <p className="text-white/70">
        Hola {session?.user?.name || session?.user?.email}, desde aquí administrás el sistema.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="rounded-xl border border-white/10 p-4 hover:bg-white/5 transition"
        >
          <h3 className="mb-2 font-medium">👤 Gestión de usuarios</h3>
          <p className="text-sm text-white/70">Alta, baja y cambio de roles.</p>
        </Link>

        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="mb-2 font-medium">⚙️ Ajustes</h3>
          <p className="text-sm text-white/70">Próximamente.</p>
        </div>
      </div>
    </div>
  );
}
