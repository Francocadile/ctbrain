"use client";

import Link from "next/link";

export function CTRoutinesFromSessionBanner({
  fromSession,
  blockIndex,
}: {
  fromSession: string;
  blockIndex: number;
}) {
  if (!fromSession || !Number.isFinite(blockIndex) || blockIndex < 0) {
    return null;
  }

  return (
    <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 flex items-center justify-between gap-2">
      <div>
        <span className="font-semibold">Vinculando rutina a una sesión</span>
        <span className="ml-1">
          · Al guardar esta rutina, se vinculará automáticamente al bloque {blockIndex + 1} de la
          sesión seleccionada.
        </span>
      </div>
      <Link
        href={`/ct/sessions/${encodeURIComponent(fromSession)}`}
        className="underline text-emerald-900 hover:text-emerald-700"
      >
        Volver a la sesión
      </Link>
    </div>
  );
}
