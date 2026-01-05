"use client";

import { useEffect, useState } from "react";
import type { DayFlag, DayFlagKind, TurnKey } from "@/lib/planner-contract";

export type DayStatusCellProps = {
  ymd: string;
  turn: TurnKey;
  weekStart: string;
  getDayFlag: (ymd: string, turn: TurnKey) => DayFlag;
  setDayFlag: (ymd: string, turn: TurnKey, df: DayFlag) => Promise<void> | void;
};

export default function DayStatusCell({ ymd, turn, weekStart, getDayFlag, setDayFlag }: DayStatusCellProps) {
  const df = getDayFlag(ymd, turn);
  const [kind, setKind] = useState<DayFlagKind>(df.kind);

  useEffect(() => {
    setKind(getDayFlag(ymd, turn).kind);
  }, [weekStart, ymd, turn, getDayFlag]);

  const save = (next: DayFlag) => void setDayFlag(ymd, turn, next);

  return (
    <div className="p-1">
      <select
        className="h-7 w-[140px] rounded-md border px-1.5 text-[11px]"
        value={kind}
        onChange={(e) => {
          const k = e.target.value as DayFlagKind;
          setKind(k);
          if (k === "NONE") return save({ kind: "NONE" });
          if (k === "LIBRE") return save({ kind: "LIBRE" });
          if (k === "PARTIDO") return save({ kind: "PARTIDO", rival: "", logoUrl: "", rivalId: undefined });
        }}
      >
        <option value="NONE">Normal</option>
        <option value="PARTIDO">Partido (MD)</option>
        <option value="LIBRE">Descanso</option>
      </select>
    </div>
  );
}
