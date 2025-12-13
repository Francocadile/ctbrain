"use client";
import * as React from "react";

type HealthBadgeProps = {
  status: "ok" | "warning" | "error";
  label?: string;
};

const STATUS_COLORS: Record<HealthBadgeProps["status"], string> = {
  ok: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

export function HealthBadge({ status, label }: HealthBadgeProps) {
  const text = label ??
    (status === "ok" ? "Sin incidencias" : status === "warning" ? "Revisar" : "Problemas");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
      aria-label={`Estado: ${text}`}
    >
      {text}
    </span>
  );
}
