// src/app/reset-password/[token]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token || "";
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "No se pudo restablecer la contraseña");
      }
      setOk(true);
      setTimeout(() => router.push("/login"), 1200);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-6 py-12">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
          <p className="mt-1 text-sm text-gray-600">
            Ingresá tu nueva contraseña (mínimo 6 caracteres).
          </p>

          {ok ? (
            <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-800">
              ¡Listo! Redirigiendo al inicio de sesión…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input
                type="password"
                name="password"
                placeholder="Nueva contraseña"
                className="w-full rounded-lg border px-3 py-2"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {err && (
                <div className="rounded bg-red-50 p-2 text-sm text-red-700">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60"
              >
                {loading ? "Guardando…" : "Guardar contraseña"}
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
