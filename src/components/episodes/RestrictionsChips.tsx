// src/components/episodes/RestrictionsChips.tsx
"use client";

import * as React from "react";

type Props = {
  noSprint?: boolean;
  noChangeOfDirection?: boolean;
  noContact?: boolean;
  gymOnly?: boolean;
  capMinutes?: number | null;
  className?: string;
  size?: "sm" | "md";
};

function Chip({
  children,
  className = "",
  size = "sm",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center rounded-full bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  const pxpy = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return <span className={`${base} ${pxpy} ${className}`}>{children}</span>;
}

export default function RestrictionsChips({
  noSprint,
  noChangeOfDirection,
  noContact,
  gymOnly,
  capMinutes,
  className = "",
  size = "sm",
}: Props) {
  const chips: React.ReactNode[] = [];

  if (noSprint) chips.push(<Chip key="ns" size={size}>Sin sprint</Chip>);
  if (noChangeOfDirection)
    chips.push(<Chip key="ncd" size={size}>Sin cambios de dirección</Chip>);
  if (noContact) chips.push(<Chip key="nc" size={size}>Sin contacto</Chip>);
  if (gymOnly) chips.push(<Chip key="gym" size={size}>Solo gimnasio</Chip>);
  if (typeof capMinutes === "number" && capMinutes >= 0)
    chips.push(<Chip key="cap" size={size}>Tope: {capMinutes}′</Chip>);

  if (chips.length === 0) {
    return (
      <span className={`text-xs text-slate-400 ${className}`}>
        Sin restricciones
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {chips.map((c) => c)}
    </div>
  );
}
