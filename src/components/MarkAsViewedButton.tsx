"use client";
import React, { useState } from "react";

export function MarkAsViewedButton({ entityType, entityId }: { entityType: 'SESSION' | 'EXERCISE'; entityId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/viewlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDone(true);
        window.alert("Marcado como visto");
      } else {
        window.alert(data.error || "Error al marcar");
      }
    } catch {
      window.alert("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold bg-black text-white hover:opacity-90 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      onClick={handleClick}
      disabled={loading || done}
    >
      {done ? "Visto" : loading ? "Marcando…" : "Marcar visto"}
    </button>
  );
}
