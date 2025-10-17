"use client";

import * as React from "react";

type ModalProps = {
  title: string;
  href: string;
  iframeSrc: string;
  onClose: () => void;
  isOpen: boolean;
};

function Modal({ title, href, iframeSrc, onClose, isOpen }: ModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 w-[95vw] max-w-5xl h-[80vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-black/5 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/5">
          <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline hover:opacity-80"
            >
              Abrir en pestaña
            </a>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg px-2 py-1 text-sm hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1">
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </div>
    </div>
  );
}

export default function CTModalsHUD() {
  const [openWeek, setOpenWeek] = React.useState(false);
  const [openToday, setOpenToday] = React.useState(false);

  return (
    <>
      {/* Botonera flotante — no interfiere con tu layout */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        <button
          onClick={() => setOpenWeek(true)}
          className="rounded-full px-4 py-2 shadow-lg bg-white dark:bg-neutral-900 border border-black/10 hover:shadow-xl"
          aria-haspopup="dialog"
        >
          Ver planificación semanal
        </button>
        <button
          onClick={() => setOpenToday(true)}
          className="rounded-full px-4 py-2 shadow-lg bg-white dark:bg-neutral-900 border border-black/10 hover:shadow-xl"
          aria-haspopup="dialog"
        >
          Sesión de hoy
        </button>
      </div>

      {/* Modal: Plan semanal (reutiliza tu page existente) */}
      <Modal
        title="Planificación semanal"
        href="/ct/plan-semanal"
        iframeSrc="/ct/plan-semanal"
        isOpen={openWeek}
        onClose={() => setOpenWeek(false)}
      />

      {/* Modal: Sesión de hoy (reutiliza tu page existente) */}
      <Modal
        title="Sesión de hoy"
        href="/ct/sessions"
        iframeSrc="/ct/sessions"
        isOpen={openToday}
        onClose={() => setOpenToday(false)}
      />
    </>
  );
}
