"use client";

import * as React from "react";
import type { ClinicalStatus } from "@/hooks/useEpisodes";

type Props = {
  status: ClinicalStatus;
  className?: string;
  size?: "sm" | "md";
};

const LABELS: Record<ClinicalStatus, string> = {
  BAJA: "Baja",
  REINTEGRO: "Reintegro",
  LIMITADA: "Limitada",
  ALTA: "Alta",
};

const HELPTEXT: Record<ClinicalStatus, string> = {
  BAJA: "Fuera de toda actividad (OUT).",
  REINTEGRO: "RTP: retorno progresivo con restricciones.",
  LIMITADA: "LIM: entrena con limitaciones.",
  ALTA: "Alta médica: sin restricciones (FULL).",
};

export default function StatusBadge({ status, className = "", size = "sm" }: Props) {
  const base =
    "inline-flex items-center rounded-full font-medium select-none whitespace-nowrap";
  const pxpy = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  const color =
    status === "ALTA"
      ? "bg-green-100 text-green-800 ring-1 ring-green-200"
      : status === "BAJA"
      ? "bg-red-100 text-red-800 ring-1 ring-red-200"
      : "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";

  const dot =
    status === "ALTA"
      ? "bg-green-500"
      : status === "BAJA"
      ? "bg-red-500"
      : "bg-yellow-500";

  return (
    <span className={`${base} ${pxpy} ${color} ${className}`} title={HELPTEXT[status]}>
      <span className={`mr-1 inline-block h-2 w-2 rounded-full ${dot}`} />
      {LABELS[status]}
      {status === "REINTEGRO" ? <span className="ml-1 opacity-70">(RTP)</span> : null}
      {status === "LIMITADA" ? <span className="ml-1 opacity-70">(LIM)</span> : null}
    </span>
  );
}
