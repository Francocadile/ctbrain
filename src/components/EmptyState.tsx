// src/components/EmptyState.tsx
"use client";
import * as React from "react";

type Props = {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  retry?: { onClick: () => void };
  className?: string;
};
export default function EmptyState({ title, description, action, retry, className="" }: Props) {
  return (
  <div className={`flex items-center justify-between card text-sm ${className}`}>
      <div>
  <div className="font-medium text-ink-900 tracking-tight">{title}</div>
  {description ? <div className="text-ink-700">{description}</div> : null}
      </div>
      <div className="flex gap-2">
        {retry ? (
          <button className="btn-secondary ui-min" onClick={retry.onClick}>
            Reintentar
          </button>
        ) : null}
        {action ? (
          <button className="btn-primary ui-min" onClick={action.onClick}>
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
