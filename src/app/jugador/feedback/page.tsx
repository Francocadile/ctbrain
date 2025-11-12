"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const MAX_TEXT = 2000;

export default function JugadorFeedbackPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/login");
    },
  });

  const playerId = session?.user?.id ?? "";
  const canSubmit = session?.user?.role === "JUGADOR" && Boolean(playerId);

  if (status === "loading") {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  }

  if (!canSubmit) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-gray-600">
        No tenés acceso a este módulo.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Enviar feedback al CT</h1>
        <p className="text-sm text-gray-600">
          Tu mensaje será visible para el cuerpo técnico y el staff médico del equipo. Usalo para compartir sensaciones, molestias o sugerencias.
        </p>
      </header>
      <FeedbackForm playerId={playerId} onSubmitted={() => router.refresh()} />
    </div>
  );
}

type FeedbackFormProps = {
  playerId: string;
  onSubmitted: () => void;
};

type SubmitState = "idle" | "loading" | "success" | "error";

function FeedbackForm({ playerId, onSubmitted }: FeedbackFormProps) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState<string>("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(() => MAX_TEXT - text.length, [text]);

  async function handleSubmit(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    if (!playerId) return;
    if (!text.trim()) {
      setError("Escribí un mensaje");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playerId,
          subject: subject.trim() || undefined,
          text: text.trim(),
          rating: rating ? Number(rating) : undefined,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error || "No se pudo enviar el feedback");
      }

      setSubject("");
      setText("");
      setRating("");
      setState("success");
      onSubmitted();
    } catch (err: any) {
      console.error("[feedback] submit failed", err);
      setState("error");
      setError(err?.message || "No se pudo enviar el feedback");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <div className="grid gap-1">
        <label htmlFor="subject" className="text-sm font-medium text-gray-700">
          Tema (opcional)
        </label>
        <input
          id="subject"
          type="text"
          maxLength={120}
          value={subject}
          onChange={(evt) => setSubject(evt.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="Ej. Molestias post entrenamiento"
        />
      </div>

      <div className="grid gap-1">
        <label htmlFor="text" className="text-sm font-medium text-gray-700">
          Mensaje
        </label>
        <textarea
          id="text"
          required
          maxLength={MAX_TEXT}
          value={text}
          onChange={(evt) => setText(evt.target.value)}
          rows={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-5 focus:border-gray-500 focus:outline-none"
          placeholder="Contanos cómo te sentís, si hay molestias o comentarios que quieras compartir."
        />
        <div className="text-end text-xs text-gray-500">{remaining} caracteres disponibles</div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Estado general (1-5, opcional)</label>
        <div className="flex gap-2">
          {["1", "2", "3", "4", "5"].map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-1 text-sm text-gray-700">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              {value}
            </label>
          ))}
          <button
            type="button"
            onClick={() => setRating("")}
            className="text-xs text-blue-600 hover:underline"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {state === "success" ? (
        <p className="text-sm text-green-600">¡Gracias! El mensaje fue enviado.</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {state === "loading" ? "Enviando…" : "Enviar feedback"}
        </button>
        <button
          type="button"
          disabled={state === "loading" || (!subject && !text && !rating)}
          onClick={() => {
            setSubject("");
            setText("");
            setRating("");
            setError(null);
            setState("idle");
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Limpiar formulario
        </button>
      </div>
    </form>
  );
}
