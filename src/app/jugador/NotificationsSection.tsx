"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NotificationsSectionProps = {
  hasTodaySession: boolean;
  hasRoutine: boolean;
  videosCount?: number;
};

export function NotificationsSection({
  hasTodaySession,
  hasRoutine,
  videosCount = 0,
}: NotificationsSectionProps) {
  const [hasRival, setHasRival] = useState(false);
  const [loadingRival, setLoadingRival] = useState(false);

  useEffect(() => {
    loadRival();
  }, []);

  async function loadRival() {
    try {
      setLoadingRival(true);
      const res = await fetch("/api/rival/next", { cache: "no-store" });
      if (!res.ok) {
        setHasRival(false);
        return;
      }
      const data = await res.json();
      setHasRival(!!data);
    } catch {
      setHasRival(false);
    } finally {
      setLoadingRival(false);
    }
  }

  const items: string[] = [];

  if (hasTodaySession) {
    items.push("Tenés sesión de campo hoy.");
  }

  if (hasRoutine) {
    items.push("Tenés una rutina de fuerza disponible.");
  }

  if (hasRival) {
    items.push("Hay información cargada del próximo rival.");
  }

  if (videosCount > 0) {
    items.push(videosCount === 1 ? "Tenés 1 video disponible." : `Tenés ${videosCount} videos disponibles.`);
  }

  if (!loadingRival && items.length === 0) {
    items.push("No tenés novedades por ahora. Estás al día.");
  }

  return (
    <section className="mb-4 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Notificaciones</h2>
        <button
          type="button"
          onClick={loadRival}
          className="text-xs text-blue-600 hover:underline"
        >
          Actualizar
        </button>
      </div>

      {loadingRival && (
        <p className="text-xs text-gray-500">
          Actualizando notificaciones...
        </p>
      )}

      {!loadingRival && (
        <>
          <ul className="space-y-1 text-xs text-gray-700">
            {items.map((msg, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>

          {videosCount > 0 ? (
            <div className="mt-2">
              <Link href="/jugador/videos" className="text-xs text-blue-600 hover:underline">
                Ver videos
              </Link>
            </div>
          ) : null}

          {hasRoutine && (
            <div className="mt-2">
              <Link href="/jugador/rutinas" className="text-xs text-blue-600 hover:underline">
                Ver rutinas de fuerza
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
