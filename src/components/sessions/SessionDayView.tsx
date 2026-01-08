"use client";

import React, { useMemo, useRef, useEffect } from "react";

export type SessionDayBlock = {
  rowKey: string; // ej: "PRE ENTREN0", "FÍSICO"
  rowLabel: string; // label visible
  title: string; // contenido del bloque
  sessionId: string; // id de la Session
  exerciseTitles?: string[]; // títulos de tareas decodificadas
};

type SessionDayViewProps = {
  date: string; // YYYY-MM-DD
  turn: "morning" | "afternoon";
  header: {
    name: string;
    place?: string | null;
    time?: string | null;
    videoUrl?: string | null;
    microLabel?: string | null;
  };
  blocks: SessionDayBlock[];
  mode: "ct" | "player";
  onEditBlock?: (block: SessionDayBlock) => void;
};

const WEEKDAY_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

function formatSessionHeaderDate(ymd: string) {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  const weekday = WEEKDAY_ES[date.getUTCDay()];
  const [year, month, day] = ymd.split("-");
  return `${weekday}, ${day}/${month}`;
}

export default function SessionDayView({
  date,
  turn,
  header,
  blocks,
  mode,
  onEditBlock,
}: SessionDayViewProps) {
  const printCSS = `
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: hidden !important; }
      .print-root, .print-root * { visibility: visible !important; }
      .print-root { position: absolute; inset: 0; margin: 0; }
      .no-print { display: none !important; }
      a[href]:after { content: ""; }
    }
  `;

  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const weekdayLabel = useMemo(() => formatSessionHeaderDate(date), [date]);

  useEffect(() => {
    // En este componente no manejamos focus por now; el scroll se puede hacer fuera si se requiere.
  }, []);

  return (
    <div className="p-4 space-y-4 print-root">
      <style jsx global>{printCSS}</style>

      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-gray-500">
            {weekdayLabel}, {turn === "morning" ? "Mañana" : "Tarde"}
          </div>
          {header.microLabel ? (
            <span className="text-[10px] px-2 py-0.5 rounded border bg-gray-50 text-gray-700 border-gray-200">
              {header.microLabel}
            </span>
          ) : null}
          {header.name ? (
            <span className="text-sm text-gray-700">
              · <b>{header.name}</b>
            </span>
          ) : null}
        </div>
      </header>

      {/* Meta / Detalles */}
  <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-emerald-50 text-emerald-900 font-semibold px-3 py-2 border-b uppercase tracking-wide text-[12px]">
          Detalles
        </div>
        <div className="grid md:grid-cols-4 gap-2 p-3 text-sm">
          <div>
            <div className="text-[11px] text-gray-500">Nombre de sesión</div>
            <div className="font-medium">
              {header.name || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Lugar</div>
            <div className="font-medium">
              {header.place || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Hora</div>
            <div className="font-medium">
              {header.time || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Video</div>
            {header.videoUrl ? (
              <a
                href={header.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="underline text-emerald-700"
                title={header.name || "Video"}
              >
                {header.name || "Video"}
              </a>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      </section>

      {/* Bloques */}
      <section className="space-y-3">
        {blocks.map((block) => (
          <div
            key={block.rowKey}
            ref={(el) => {
              blockRefs.current[block.rowKey] = el;
            }}
            className="rounded-2xl border bg-white shadow-sm p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                {block.rowLabel}
              </h2>

              {block.sessionId && (
                <div className="flex gap-2 no-print">
                  {mode === "ct" ? (
                    <>
                      <a
                        href={`/ct/sessions/${block.sessionId}?view=1`}
                        className="text-[11px] rounded-md border px-2 py-1 hover:bg-gray-50"
                      >
                        Ver ejercicio
                      </a>
                      {onEditBlock ? (
                        <button
                          type="button"
                          className="text-[11px] rounded-md border px-2 py-1 hover:bg-gray-50"
                          onClick={() => onEditBlock(block)}
                        >
                          Editar ejercicios
                        </button>
                      ) : (
                        <a
                          href={`/ct/sessions/${block.sessionId}`}
                          className="text-[11px] rounded-md border px-2 py-1 hover:bg-gray-50"
                        >
                          Editar ejercicios
                        </a>
                      )}
                    </>
                  ) : mode === "player" ? (
                    <a
                      href={`/jugador/sesiones/${block.sessionId}`}
                      className="text-[11px] rounded-md border px-2 py-1 hover:bg-gray-50"
                    >
                      Ver ejercicio
                    </a>
                  ) : null}
                </div>
              )}
            </div>
            <div className="min-h-[120px] text-[13px] leading-6 space-y-1">
              <div className="whitespace-pre-wrap">
                {block.title ? (
                  block.title
                ) : (
                  <span className="text-gray-400 italic">—</span>
                )}
              </div>
              {block.exerciseTitles && block.exerciseTitles.length > 0 && (
                <div className="mt-1 text-[12px] text-gray-600">
                  <ul className="list-disc list-inside space-y-0.5">
                    {block.exerciseTitles.slice(0, 4).map((t, idx) => (
                      <li key={`${block.rowKey}-ex-${idx}`}>{t}</li>
                    ))}
                  </ul>
                  {block.exerciseTitles.length > 4 && (
                    <div className="text-[11px] text-gray-500">
                      +{block.exerciseTitles.length - 4} más
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
