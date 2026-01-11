"use client";

import Link from "next/link";
import { useState } from "react";
import EditPlayerForm from "@/app/ct/plantel/components/EditPlayerForm";
import ActivateAccessModal from "@/app/ct/plantel/components/ActivateAccessModal";
import type { PlayerWithUser } from "@/app/ct/plantel/components/PlantelTable";

export default function PlantelRow({ player }: { player: PlayerWithUser }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  const hasAccess = !!player.userId;

  return (
    <tr className="border-t text-sm">
      <td className="px-3 py-2">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">Sin foto</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 font-medium">{player.name}</td>
      <td className="px-3 py-2 text-gray-600">{player.position || "-"}</td>
      <td className="px-3 py-2 text-gray-600">{player.shirtNumber ?? "-"}</td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
          {player.status}
        </span>
      </td>
      <td className="px-3 py-2">
        {hasAccess ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Con acceso
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            Sin acceso
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            onClick={() => setShowEdit(true)}
          >
            Editar
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            onClick={() => setShowAccess(true)}
          >
            {hasAccess ? "Gestionar acceso" : "Activar acceso"}
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border border-gray-200 hover:bg-red-50"
            onClick={async () => {
              if (!confirm("¿Eliminar jugador? Esta acción no se puede deshacer.")) return;

              const res = await fetch(`/api/ct/plantel/${player.id}`, { method: "DELETE" });

              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert((data as any)?.error ?? "No se pudo eliminar.");
                return;
              }

              window.location.reload();
            }}
          >
            Eliminar
          </button>
          <Link
            href={`/ct/plantel/${player.id}`}
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
          >
            Ver perfil
          </Link>
        </div>

        {showEdit && (
          <EditPlayerForm player={player} onClose={() => setShowEdit(false)} />
        )}
        {showAccess && (
          <ActivateAccessModal player={player} onClose={() => setShowAccess(false)} />
        )}
      </td>
    </tr>
  );
}
