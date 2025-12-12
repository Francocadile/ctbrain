"use client";

import { useState } from "react";

export default function RequestResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo procesar la solicitud");
      }
      setMessage("Si el email existe, te enviamos un enlace de reset.");
    } catch (err: any) {
      setError(err?.message || "Error al solicitar el reset");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <header>
            <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
            <p className="mt-1 text-sm text-gray-600">
              Ingresá tu email y, si existe en el sistema, te enviaremos un enlace para
              restablecer tu contraseña.
            </p>
          </header>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900/90 disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
