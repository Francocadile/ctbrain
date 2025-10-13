"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlayerSelectMed from "@/components/PlayerSelectMed";

function AsignarRutinaContent() {
  const params = useSearchParams();
  const rutinaId = params.get("id") || "";
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function handleAsignar() {
    setMsg("");
    if (!rutinaId || selectedPlayers.length === 0) {
      setMsg("Selecciona al menos un jugador.");
      return;
    }
    try {
      await fetch(`/api/routines/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rutinaId, playerIds: selectedPlayers }),
      });
      setMsg("Rutina asignada correctamente");
      setTimeout(() => router.push("/ct/rutinas/biblioteca"), 1200);
    } catch {
      setMsg("Error al asignar rutina");
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
  <h1 className="h2 text-ink-900 mb-6 tracking-tight">Asignar rutina a jugadores</h1>
      <div className="mb-4">
        <PlayerSelectMed
          value={""}
          onChange={id => setSelectedPlayers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
          label="Selecciona jugadores (puedes elegir varios)"
        />
    <div className="mt-2 small text-ink-500">Jugadores seleccionados: {selectedPlayers.length}</div>
      </div>
  <button className="btn-primary ui-min" onClick={handleAsignar}>Asignar rutina</button>
  {msg && <div className={`mt-2 small ${msg.includes('Error') ? 'badge-error' : 'badge-success'}`}>{msg}</div>}
    </div>
  );
}

export default function AsignarRutinaPage() {
  return (
    <Suspense>
      <AsignarRutinaContent />
    </Suspense>
  );
}
