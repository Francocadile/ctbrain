"use client";

import { useEffect, useState } from "react";
import type { MicroKey, TurnKey } from "@/lib/planner-contract";
import { MICRO_CHOICES } from "@/lib/planner-contract";

export type MicroCellProps = {
  ymd: string;
  turn: TurnKey;
  weekStart: string;
  getMicroValue: (ymd: string, turn: TurnKey) => MicroKey;
  setMicroValue: (ymd: string, turn: TurnKey, value: MicroKey) => Promise<void> | void;
};

export default function MicroCell({ ymd, turn, weekStart, getMicroValue, setMicroValue }: MicroCellProps) {
  const [val, setVal] = useState<MicroKey>(getMicroValue(ymd, turn));

  useEffect(() => {
    setVal(getMicroValue(ymd, turn));
  }, [weekStart, ymd, turn, getMicroValue]);

  const cls = MICRO_CHOICES.find((c) => c.value === val)?.colorClass || "";

  return (
    <div className={`p-1 ${cls}`}>
      <select
        className={`h-7 w-full rounded-md border px-1.5 text-[11px] ${cls}`}
        value={val}
        onChange={async (e) => {
          const nextVal = e.target.value as MicroKey;
          setVal(nextVal);
          await setMicroValue(ymd, turn, nextVal);
        }}
      >
        {MICRO_CHOICES.map((opt) => (
          <option key={opt.value || "none"} value={opt.value}>
            {opt.value || "—"}
          </option>
        ))}
      </select>
    </div>
  );
}
