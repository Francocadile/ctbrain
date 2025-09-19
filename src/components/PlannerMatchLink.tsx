// src/components/PlannerMatchLink.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Si ya lo tenés, navega directo */
  rivalId?: string | null;
  /** Texto del evento: "Partido vs Boca", "vs River", etc. */
  title?: string | null;
  /** Etiqueta del botón (opcional) */
  label?: string;
  /** Clase extra (opcional) */
  className?: string;
};

export default function PlannerMatchLink({
  rivalId,
  title,
  label = "Plan del rival",
  className = "",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Si ya tenemos el id, usamos Link directo
  if (rivalId) {
    return (
      <Link
        href={`/ct/rivales/${rivalId}?tab=plan`}
        className={`text-xs px-2 py-1 rounded-md border hover:bg-gray-50 ${className}`}
      >
        {label}
      </Link>
    );
  }

  // Si no hay id, resolvemos por título
  async function go() {
    const q = (title || "").trim();
    if (!q) {
      alert("No hay texto para identificar al rival.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/ct/rivales/resolve?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const id = json?.data?.id;
      if (!id) throw new Error("Sin id de rival");
      router.push(`/ct/rivales/${id}?tab=plan`);
    } catch (e: any) {
      alert(e?.message || "No pudimos identificar el rival a partir del evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded-md border ${loading ? "bg-gray-200 text-gray-500" : "hover:bg-gray-50"} ${className}`}
      title={title || ""}
    >
      {loading ? "Abriendo…" : label}
    </button>
  );
}
