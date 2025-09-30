// src/app/reset-password/[token]/page.tsx
"use client";

import * as React from "react";

export default function ResetPasswordTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const token = decodeURIComponent(params.token);
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [msg, setMsg] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      setMsg("Las contraseñas no coinciden");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("ok");
      setMsg("Contraseña actualizada. Ya podés iniciar sesión.");
    } catch {
      setStatus("error");
      setMsg("El enlace no es válido o venció. Solicitá uno nuevo.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border bg-white p-6 space-y-4"
      >
        <h1 className="text-lg font-semibold">Crear nueva contraseña</h1>
        <label className="block text-sm">
          Nueva contraseña
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <label className="block text-sm">
          Repetir contraseña
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <button
          disabled={status === "loading"}
          className="w-full rounded bg-black px-3 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {status === "loading" ? "Guardando..." : "Actualizar contraseña"}
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
