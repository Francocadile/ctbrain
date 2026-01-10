"use client";

import { useEffect, useRef } from "react";
import type { TurnKey, DayFlag } from "@/lib/planner-contract";

export type EditableCellProps = {
  dayYmd: string;
  turn: TurnKey;
  row: string;
  initialText: string;
  flag: DayFlag;
  sessionHref: string;
  onCommit: (text: string) => void;
};

export default function EditableCell({
  dayYmd,
  turn,
  row,
  initialText,
  flag,
  sessionHref,
  onCommit,
}: EditableCellProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Mantener initialText en el DOM cuando cambia el valor inicial,
  // sin sobreescribir lo que el usuario ya esté editando mientras
  // dayYmd/turn/row no cambien.
  useEffect(() => {
    if (!ref.current) return;
    // Solo sincronizamos cuando cambia la clave lógica de la celda
    // o el texto inicial, para evitar pisar la edición del usuario.
    ref.current.innerText = initialText || "";
  }, [initialText, dayYmd, turn, row]);

  const onBlur = () => {
    const txt = ref.current?.innerText ?? "";
    onCommit(txt);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const txt = ref.current?.innerText ?? "";
      onCommit(txt);
    }
  };

  const flagBadge =
    flag.kind === "LIBRE" ? (
      <span className="text-[10px] bg-gray-100 border px-1.5 py-0.5 rounded">DÍA LIBRE</span>
    ) : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div>{flagBadge}</div>
        {sessionHref ? (
          <a
            href={sessionHref}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
            title="Cargar ejercicios de la sesión"
          >
            <span className="text-[9px]" aria-hidden="true">
              ➜
            </span>
            <span>Cargar ejercicios de la sesión</span>
          </a>
        ) : null}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-emerald-400 whitespace-pre-wrap"
        data-placeholder="Contenidos / títulos (breves)…"
      >
        {initialText}
      </div>
    </div>
  );
}
