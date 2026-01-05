"use client";

import { useEffect, useState } from "react";
import PlannerMatchLink from "@/components/PlannerMatchLink";
import type { DayFlag, TurnKey } from "@/lib/planner-contract";
import { extractRivalIdFromUrl } from "@/lib/planner-contract";

export type PartidoCellProps = {
  ymd: string;
  turn: TurnKey;
  weekStart: string;
  getDayFlag: (ymd: string, turn: TurnKey) => DayFlag;
  setDayFlag: (ymd: string, turn: TurnKey, df: DayFlag) => Promise<void> | void;
};

export default function PartidoCell({ ymd, turn, weekStart, getDayFlag, setDayFlag }: PartidoCellProps) {
  const df = getDayFlag(ymd, turn);
  const isMatch = df.kind === "PARTIDO";

  if (!isMatch) {
    return <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center">—</div>;
  }

  const [isEditing, setIsEditing] = useState(!(df.rival || df.logoUrl));
  const [localRival, setLocalRival] = useState(df.rival || "");
  const [localLogo, setLocalLogo] = useState(df.logoUrl || "");
  const [hiddenRivalId, setHiddenRivalId] = useState<string>(df.rivalId || "");

  useEffect(() => {
    const fresh = getDayFlag(ymd, turn);
    setIsEditing(!(fresh.rival || fresh.logoUrl));
    setLocalRival(fresh.rival || "");
    setLocalLogo(fresh.logoUrl || "");
    setHiddenRivalId(fresh.rivalId || "");
  }, [weekStart, ymd, turn, getDayFlag]);

  function onRivalChange(v: string) {
    setLocalRival(v);
    const maybeId = extractRivalIdFromUrl(v);
    if (maybeId) setHiddenRivalId(maybeId);
  }

  const commit = async () => {
    await setDayFlag(ymd, turn, {
      kind: "PARTIDO",
      rival: (localRival || "").trim(),
      logoUrl: (localLogo || "").trim(),
      rivalId: (hiddenRivalId || "").trim() || undefined,
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    const fallbackHref = `/ct/sessions/by-day/${ymd}/${turn}`;
    return (
      <div className="flex items-center justify-between gap-1">
        <div className="h-6 text-[11px] px-1 flex items-center truncate gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {localLogo ? <img src={localLogo} alt="Logo" className="w-[16px] h-[16px] object-contain rounded" /> : null}
          <span className="truncate">{localRival || "—"}</span>
        </div>
        <div className="flex items-center gap-1">
          <PlannerMatchLink
            rivalId={hiddenRivalId || undefined}
            rivalName={localRival || undefined}
            label="Plan rival"
            className="h-6"
            fallbackHref={fallbackHref}
          />
          <button
            type="button"
            className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
            onClick={() => setIsEditing(true)}
            title="Editar"
          >
            ✏️
          </button>
          <button
            type="button"
            className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
            onClick={async () => {
              setLocalRival("");
              setLocalLogo("");
              setHiddenRivalId("");
              await setDayFlag(ymd, turn, { kind: "PARTIDO", rival: "", logoUrl: "", rivalId: undefined });
            }}
            title="Borrar"
          >
            ❌
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        className="h-8 w-[58%] rounded-md border px-2 text-xs"
        placeholder="Rival (nombre o link /ct/rivales/:id)"
        value={localRival}
        onChange={(e) => onRivalChange(e.target.value)}
      />
      <input
        type="url"
        className="h-8 w-[34%] rounded-md border px-2 text-xs"
        placeholder="Logo URL"
        value={localLogo}
        onChange={(e) => setLocalLogo(e.target.value)}
      />
      <button
        type="button"
        className="h-8 px-2 rounded border text-[11px] hover:bg-gray-50"
        onClick={commit}
        title="Listo"
      >
        ✓
      </button>
    </div>
  );
}
