// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-6 py-12">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-gray-600">
            Ingresá tu email y te enviaremos un enlace para restablecerla.
          </p>

          {sent ? (
            <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-800">
              Si el email existe, vas a recibir un enlace. Revisá tu correo.
              <p className="mt-2 text-xs text-emerald-700">
                (En esta etapa, el enlace también aparece en los logs del servidor.)
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full rounded-lg border px-3 py-2"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60"
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>

              <div className="mt-2 text-center">
                <a href="/login" className="text-sm text-gray-600 hover:underline">
                  Volver a iniciar sesión
                </a>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
