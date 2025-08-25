"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useSession } from "next-auth/react";

export default function MedicoPage() {
  const { data: session } = useSession();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Panel — Cuerpo Médico</h2>
      <p className="text-white/70">Hola {session?.user?.name || session?.user?.email}.</p>
      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-sm text-white/70">Contenido médico (próximamente).</p>
      </div>
    </div>
  );
}
