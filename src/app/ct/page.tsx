"use client";
export const dynamic = "force-dynamic";
export const revalidate = false;

import { useSession } from "next-auth/react";

export default function CtPage() {
  const { data: session } = useSession();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Panel — Cuerpo Técnico</h2>
      <p className="text-white/70">Hola {session?.user?.name || session?.user?.email}.</p>
      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-sm text-white/70">Contenido del CT (próximamente).</p>
      </div>
    </div>
  );
}
