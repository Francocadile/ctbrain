"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginClient() {
  const [loadingLogin, setLoadingLogin] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoadingLogin(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/", // la redirección se maneja por el callback de NextAuth
    });

    setLoadingLogin(false);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Card: Login */}
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

          {/* CTA a signup */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">¿No tenés cuenta?</p>
            <a
              href="/signup"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              title="Crear una cuenta"
            >
              Crear una cuenta
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
