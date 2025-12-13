"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const [loadingLogin, setLoadingLogin] = useState(false);

  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    // Borra cualquier sesión previa sin redirigir
    signOut({ redirect: false });
  }, []);

  const niceError =
    error === "CredentialsSignin" ? "Email o contraseña incorrectos." : null;

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
      callbackUrl: "/redirect",
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

          {niceError && (
            <p className="mt-3 text-sm text-red-600">{niceError}</p>
          )}

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

          {/* Signup público deshabilitado: se quita el CTA a /signup */}
        </section>
      </div>
    </main>
  );
}
