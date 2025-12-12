"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";

export default function ResetWithTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = (params?.token as string) || "";

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Token inválido.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo restablecer la contraseña");
      }
      setSuccess("Contraseña actualizada. Ahora podés iniciar sesión.");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <header>
            <h1 className="text-xl font-semibold">Establecer nueva contraseña</h1>
            <p className="mt-1 text-sm text-gray-600">
              Ingresá tu nueva contraseña para completar el proceso.
            </p>
          </header>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="newPassword">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-1">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="newPasswordConfirm"
              >
                Repetir nueva contraseña
              </label>
              <input
                id="newPasswordConfirm"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900/90 disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
