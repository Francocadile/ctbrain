"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";

export function RoutineActions({
  routineId,
  fromSession,
  blockIndex,
}: {
  routineId: string;
  fromSession?: string;
  blockIndex?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("¿Seguro que querés eliminar esta rutina? Esta acción no se puede deshacer.")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/ct/routines/${routineId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          console.error("Error al borrar rutina", await res.text());
          alert("No se pudo eliminar la rutina. Probá de nuevo.");
          return;
        }

        router.refresh();
      } catch (err) {
        console.error(err);
        alert("Ocurrió un error de red al eliminar la rutina.");
      }
    });
  };

  return (
    <div className="mt-3 flex justify-end gap-2">
      <Link
        href={(() => {
          let url = `/ct/rutinas/${routineId}`;
          if (fromSession && typeof blockIndex === "number" && blockIndex >= 0) {
            const sp = new URLSearchParams();
            sp.set("fromSession", fromSession);
            sp.set("block", String(blockIndex));
            url += `?${sp.toString()}`;
          }
          return url;
        })()}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  );
}
