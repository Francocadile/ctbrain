// src/components/episodes/StatusBadge.tsx
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

  return (
    <span className={`${base} ${pxpy} ${color} ${className}`}>
      <span
        className={`mr-1 inline-block h-2 w-2 rounded-full ${
          status === "ALTA"
            ? "bg-green-500"
            : status === "BAJA"
            ? "bg-red-500"
            : "bg-yellow-500"
        }`}
      />
      {LABELS[status]}
    </span>
  );
}
