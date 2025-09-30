// src/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const search = useSearchParams();
  const cb = search.get("callbackUrl") || "/redirect"; // adonde volver tras login

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loadingLogin) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingLogin(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: cb,
    });

    setLoadingLogin(false);
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loadingSignup) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingSignup(true);

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
      .trim()
      .toLowerCase();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Alta pública: solo rol JUGADOR
        body: JSON.stringify({ name, email, password, role: "JUGADOR" }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        const msg =
          (typeof data?.error === "string" && data.error) ||
          "No se pudo crear el usuario";
        throw new Error(msg);
      }

      setSuccessMsg(
        "Cuenta creada. Un Admin debe aprobar tu acceso. Podés iniciar sesión luego."
      );
      form.reset();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Error creando la cuenta");
    } finally {
      setLoadingSignup(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-12 lg:grid-cols-2">
        {/* LOGIN */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header>
            <h1 className="text-2xl font-bold">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-gray-600">
              Accedé con tu email y contraseña.
            </p>
          </header>

          <form onSubmit={handleLogin} className="mt-6 space-y-3">
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
              placeholder="Contraseña"
              className="w-full rounded-lg border px-3 py-2"
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full rounded-lg border bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60"
            >
              {loadingLogin ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </section>

        {/* ALTA RÁPIDA JUGADOR */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-lg font-semibold">Crear cuenta (Jugador)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Alta pública habilitada solo para <b>JUGADOR</b>. Otros roles se crean
              desde Admin.
            </p>
          </header>

          {errorMsg && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
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
              disabled={loadingSignup}
              className="w-full rounded-lg border bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900/90 disabled:opacity-60"
            >
              {loadingSignup ? "Creando..." : "Crear cuenta (Jugador)"}
            </button>
          </form>

          <p className="mt-3 text-xs text-gray-500">
            ¿Necesitás acceso como <b>CT</b>, <b>Médico</b> o <b>Directivo</b>? Pedilo a
            un Admin.
          </p>
        </section>
      </div>
    </main>
  );
}
