"use client";

import type { TurnKey } from "@/lib/planner-contract";
import type { DayTypeDef, DayTypeId } from "@/lib/planner-daytype";

export type DayTypeCellProps = {
  ymd: string;
  turn: TurnKey;
  value: DayTypeId | "";
  onSelectedChange: (nextId: DayTypeId | "") => void;
  types: DayTypeDef[];
};

export default function DayTypeCell({ value, onSelectedChange, types }: DayTypeCellProps) {
  const selectedDef = types.find((t) => t.id === value);

  return (
    <div className="flex items-center gap-1 text-[11px] h-7">
      <div
        className="w-3 h-3 rounded-full border"
        style={{ backgroundColor: selectedDef?.color || "#f9fafb" }}
      />
      <select
        className="h-7 flex-1 rounded-md border px-1.5 text-[11px] min-w-0"
        value={value || ""}
        onChange={(e) => onSelectedChange(e.target.value as DayTypeId)}
      >
        <option value="">—</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

