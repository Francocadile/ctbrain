"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Podríamos loguear a un servicio externo en el futuro
    // Por ahora solo log al console.
    // eslint-disable-next-line no-console
    console.error("GlobalError boundary", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="max-w-md w-full px-6 py-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-4">
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="text-sm text-slate-300">
            Se produjo un error inesperado. Si el problema persiste, avisá al
            staff de OPENBASE.
          </p>
          {error?.digest && (
            <p className="text-xs text-slate-500">
              ID de error: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-600 transition"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
