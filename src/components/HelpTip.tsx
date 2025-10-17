"use client";
import * as React from "react";

type HelpTipProps = {
  /** Texto del tooltip (explicación corta y clara) */
  text: string;
  /** Posición preferida del tooltip respecto al icono */
  side?: "top" | "bottom" | "left" | "right";
  /** Clases extra para el contenedor externo */
  className?: string;
  /** Tamaño del icono (px). Default: 16 */
  sizePx?: number;
};

/**
 * HelpTip
 * Icono “?” con tooltip accesible para pequeñas ayudas de UX.
 * - Accesible por teclado (tab + focus)
 * - Sin dependencias externas (solo Tailwind)
 * - Posicionamiento configurable (top/bottom/left/right)
 */
export default function HelpTip({
  text,
  side = "top",
  className = "",
  sizePx = 16,
}: HelpTipProps) {
  const id = React.useId();

  const posClass = (() => {
    switch (side) {
      case "bottom":
        return "left-1/2 -translate-x-1/2 top-full mt-1";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "left-1/2 -translate-x-1/2 bottom-full mb-1";
    }
  })();

  const bubble =
    "pointer-events-none absolute z-50 hidden max-w-xs rounded-md border bg-white px-2 py-1 text-xs text-gray-700 shadow-lg";
  const caretBase = "absolute w-0 h-0 border-transparent";
  const iconPx = Math.max(12, Math.min(22, sizePx));
  const iconClass =
    "inline-flex items-center justify-center rounded-full border text-[10px] leading-none select-none cursor-help " +
    "text-gray-700 border-gray-300 bg-white hover:bg-gray-50 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black";

  const caret = (() => {
    switch (side) {
      case "bottom":
        return (
          <span
            aria-hidden
            className={`${caretBase} left-1/2 -translate-x-1/2 -top-[6px] border-b-white border-[6px]`}
            style={{ borderTopWidth: 0 }}
          />
        );
      case "left":
        return (
          <span
            aria-hidden
            className={`${caretBase} -right-[6px] top-1/2 -translate-y-1/2 border-l-white border-[6px]`}
            style={{ borderRightWidth: 0 }}
          />
        );
      case "right":
        return (
          <span
            aria-hidden
            className={`${caretBase} -left-[6px] top-1/2 -translate-y-1/2 border-r-white border-[6px]`}
            style={{ borderLeftWidth: 0 }}
          />
        );
      case "top":
      default:
        return (
          <span
            aria-hidden
            className={`${caretBase} left-1/2 -translate-x-1/2 -bottom-[6px] border-t-white border-[6px]`}
            style={{ borderBottomWidth: 0 }}
          />
        );
    }
  })();

  return (
    <span className={`relative inline-flex items-center align-middle ${className}`}>
      <span className="group relative inline-flex">
        {/* Botón/trigger accesible */}
        <button
          type="button"
          aria-describedby={id}
          className={iconClass}
          style={{ width: iconPx, height: iconPx }}
        >
          ?
        </button>

        {/* Tooltip */}
        <span
          id={id}
          role="tooltip"
          className={`${bubble} ${posClass} group-hover:block group-focus-within:block`}
        >
          {text}
          {caret}
        </span>
      </span>
    </span>
  );
}
"use client";
import * as React from "react";

type Props = { text?: string; className?: string };

export default function HelpTip({ text = "Ayuda", className }: Props) {
  return <span className={className} title={text}>ⓘ</span>;
}
// src/components/HelpTip.tsx
"use client";

import * as React from "react";

type HelpTipProps = {
  /** Texto del tooltip (explicación corta y clara) */
  text: string;
  /** Posición preferida del tooltip respecto al icono */
  side?: "top" | "bottom" | "left" | "right";
  /** Clases extra para el contenedor externo */
  className?: string;
  /** Tamaño del icono (px). Default: 16 */
  sizePx?: number;
};

/**
 * HelpTip
 * Icono “?” con tooltip accesible para pequeñas ayudas de UX.
 * - Accesible por teclado (tab + focus)
 * - Sin dependencias externas (solo Tailwind)
 * - Posicionamiento configurable (top/bottom/left/right)
 */
export default function HelpTip({
  text,
  side = "top",
  className = "",
  sizePx = 16,
}: HelpTipProps) {
  const id = React.useId();

  const posClass = (() => {
    switch (side) {
      case "bottom":
        return "left-1/2 -translate-x-1/2 top-full mt-1";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "left-1/2 -translate-x-1/2 bottom-full mb-1";
    }
  })();

  // Tailwind classes comunes
  const bubble =
    "pointer-events-none absolute z-50 hidden max-w-xs rounded-md border bg-white px-2 py-1 text-xs text-gray-700 shadow-lg";
  const caretBase =
    "absolute w-0 h-0 border-transparent";
  const iconPx = Math.max(12, Math.min(22, sizePx));
  const iconClass =
    "inline-flex items-center justify-center rounded-full border text-[10px] leading-none select-none cursor-help " +
    "text-gray-700 border-gray-300 bg-white hover:bg-gray-50 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black";

  // Triangulito (caret) según lado
  const caret = (() => {
    switch (side) {
      case "bottom":
        return (
          <span
            aria-hidden
            className={`${caretBase} left-1/2 -translate-x-1/2 -top-[6px] border-b-white border-[6px]`}
            style={{ borderTopWidth: 0, borderLeftColor: "transparent", borderRightColor: "transparent" }}
          />
        );
      case "left":
        return (
          <span
            aria-hidden
            className={`${caretBase} -right-[6px] top-1/2 -translate-y-1/2 border-l-white border-[6px]`}
            style={{ borderTopColor: "transparent", borderBottomColor: "transparent", borderRightWidth: 0 }}
          />
        );
      case "right":
        return (
          <span
            aria-hidden
            className={`${caretBase} -left-[6px] top-1/2 -translate-y-1/2 border-r-white border-[6px]`}
            style={{ borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftWidth: 0 }}
          />
        );
      case "top":
      default:
        return (
          <span
            aria-hidden
            className={`${caretBase} left-1/2 -translate-x-1/2 -bottom-[6px] border-t-white border-[6px]`}
            style={{ borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomWidth: 0 }}
          />
        );
    }
  })();

  return (
    <span className={`relative inline-flex items-center align-middle ${className}`}>
      <span className="group relative inline-flex">
        {/* Botón/trigger accesible */}
        <button
          type="button"
          aria-describedby={id}
          className={iconClass}
          style={{ width: iconPx, height: iconPx }}
        >
          ?
        </button>

        {/* Tooltip */}
        <span
          id={id}
          role="tooltip"
          className={`${bubble} ${posClass} group-hover:block group-focus-within:block`}
        >
          {text}
          {caret}
        </span>
      </span>
    </span>
  );
}
