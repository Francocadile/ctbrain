"use client";

import { useState } from "react";

export default function SignupClient() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ name, email, password, role: "JUGADOR" }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        const msg =
          (data?.error && typeof data.error === "string"
            ? data.error
            : "No se pudo crear el usuario") || "No se pudo crear el usuario";
        throw new Error(msg);
      }

      setSuccessMsg(
        "Cuenta creada. Un Admin debe aprobar tu acceso. Luego podés iniciar sesión."
      );
      form.reset();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Error creando la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-6 py-12">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header>
            <h1 className="text-2xl font-bold">Crear cuenta</h1>
            <p className="mt-1 text-sm text-gray-600">
              Alta pública habilitada solo para <b>JUGADOR</b>. Otros roles se crean desde Admin.
            </p>
          </header>

          {errorMsg && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMsg}
            </p>
          )}

          <form onSubmit={handleSignup} className="mt-4 space-y-3">
            <input
              type="text"
              name="name"
              placeholder="Nombre y apellido"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña (mín. 6)"
              className="w-full rounded-lg border px-3 py-2"
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900/90 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear cuenta (Jugador)"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">¿Ya tenés cuenta?</p>
            <a
              href="/login"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              title="Volver al login"
            >
              Volver al login
            </a>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            ¿Necesitás acceso como <b>CT</b>, <b>Médico</b> o <b>Directivo</b>? Pedilo a un Admin.
          </p>
        </section>
      </div>
    </main>
  );
}
