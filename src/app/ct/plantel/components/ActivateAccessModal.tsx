"use client";

import { useState } from "react";
import type { PlayerWithUser } from "@/app/ct/plantel/components/PlantelTable";

export default function ActivateAccessModal({ player, onClose }: { player: PlayerWithUser; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [generatePassword, setGeneratePassword] = useState(true);
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ct/plantel/${player.id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          generatePassword,
          password: generatePassword ? null : password || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al activar acceso");
      }
      const data = await res.json().catch(() => ({}));
      if (data?.password) {
        setGeneratedPassword(data.password as string);
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Error al activar acceso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg text-sm">
        <h2 className="text-sm font-semibold mb-3">Activar acceso para {player.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={generatePassword}
              onChange={(e) => setGeneratePassword(e.target.checked)}
            />
            <span>Generar contraseña aleatoria</span>
          </label>

          {!generatePassword && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar vacío para usar 123123"
              />
            </div>
          )}

          {generatedPassword && (
            <div className="rounded-md bg-gray-50 border px-2 py-1.5 text-xs text-gray-700">
              Contraseña generada: <span className="font-mono font-semibold">{generatedPassword}</span>
              <br />
              Compartila con el jugador para su primer acceso.
            </div>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border text-xs"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Activando…" : "Activar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
