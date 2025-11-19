"use client";

import { useState } from "react";

export default function CreatePlayerForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    shirtNumber: "",
    position: "",
    photoUrl: "",
    status: "ACTIVO",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ct/plantel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          shirtNumber: form.shirtNumber ? Number(form.shirtNumber) : null,
          position: form.position || null,
          photoUrl: form.photoUrl || null,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear jugador");
      }
      setOpen(false);
      setForm({ name: "", shirtNumber: "", position: "", photoUrl: "", status: "ACTIVO" });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Error al crear jugador");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
        onClick={() => setOpen(true)}
      >
        + Añadir jugador
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg">
        <h2 className="text-sm font-semibold mb-3">Nuevo jugador</h2>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dorsal</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                type="number"
                value={form.shirtNumber}
                onChange={(e) => setForm(f => ({ ...f, shirtNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Posición</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.position}
                onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Foto (URL)</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.photoUrl}
              onChange={(e) => setForm(f => ({ ...f, photoUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVO">Activo</option>
              <option value="LESIONADO">Lesionado</option>
              <option value="RECUPERACION">Recuperación</option>
              <option value="ALTA_PARCIAL">Alta parcial</option>
              <option value="ALTA_TOTAL">Alta total</option>
            </select>
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border text-xs"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
