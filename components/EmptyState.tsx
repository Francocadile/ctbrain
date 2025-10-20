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
    <div className={`flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-sm ${className}`}>
      <div>
        <div className="font-medium text-gray-800">{title}</div>
        {description ? <div className="text-gray-600">{description}</div> : null}
      </div>
      <div className="flex gap-2">
        {retry ? (
          <button className="rounded-md border px-3 py-1" onClick={retry.onClick}>
            Reintentar
          </button>
        ) : null}
        {action ? (
          <button className="rounded-md border px-3 py-1" onClick={action.onClick}>
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
