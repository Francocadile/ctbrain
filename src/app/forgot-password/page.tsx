// src/app/forgot-password/page.tsx
"use client";

import * as React from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Error");
      setStatus("ok");
      setMsg(
        "Si el email existe, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada."
      );
    } catch {
      setStatus("error");
      setMsg("Ocurrió un error. Intenta nuevamente.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border bg-white p-6 space-y-4"
      >
        <h1 className="text-lg font-semibold">Restablecer contraseña</h1>
        <label className="block text-sm">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button
          disabled={status === "loading"}
          className="w-full rounded bg-black px-3 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {status === "loading" ? "Enviando..." : "Enviar enlace"}
        </button>
        {msg && (
          <p
            className={`text-sm ${
              status === "ok" ? "text-green-600" : "text-red-600"
            }`}
          >
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}
