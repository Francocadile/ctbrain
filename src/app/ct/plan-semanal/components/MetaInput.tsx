"use client";

import { useEffect, useState } from "react";
import type { DayFlag, TurnKey } from "@/lib/planner-contract";
import { parseVideoValue, joinVideoValue } from "@/lib/planner-contract";
import type { SessionDTO } from "@/lib/api/sessions";
import DayStatusCell from "./DayStatusCell";
import MicroCell from "./MicroCell";
import PartidoCell from "./PartidoCell";
import DayTypeCell from "./DayTypeCell";

export type MetaRowId =
  | "NOMBRE SESIÓN"
  | "TIPO"
  | "INTENSIDAD"
  | "LUGAR"
  | "HORA"
  | "VIDEO"
  | "RIVAL";

export type MetaInputProps = {
  dayYmd: string;
  turn: TurnKey;
  row: MetaRowId;
  sessionNameRowId: string;
  existing: SessionDTO | undefined;
  pendingValue: string | undefined;
  weekStart: string;
  getDayFlag: (ymd: string, turn: TurnKey) => DayFlag;
  getMicroValue: (ymd: string, turn: TurnKey) => any;
  setDayFlag: (ymd: string, turn: TurnKey, df: DayFlag) => Promise<void> | void;
  setMicroValue: (ymd: string, turn: TurnKey, value: any) => Promise<void> | void;
  stageCell: (dayYmd: string, turn: TurnKey, row: string, text: string) => void;
  setVideoPreview: (payload: { title: string; zone?: string | null; videoUrl?: string | null } | null) => void;
  places: string[];
};

export default function MetaInput({
  dayYmd,
  turn,
  row,
  sessionNameRowId,
  existing,
  pendingValue,
  weekStart,
  getDayFlag,
  getMicroValue,
  setDayFlag,
  setMicroValue,
  stageCell,
  setVideoPreview,
  places,
}: MetaInputProps) {
  const original = (existing?.title ?? "").trim();
  const value = pendingValue !== undefined ? pendingValue : original;

  if (row === "TIPO") {
    return (
      <div className="min-h-8 w-full flex flex-col gap-1 text-[11px]">
        <div className="flex items-center gap-2">
          <DayStatusCell
            ymd={dayYmd}
            turn={turn}
            weekStart={weekStart}
            getDayFlag={getDayFlag}
            setDayFlag={setDayFlag}
          />
        </div>
        <div className="flex items-center gap-2">
          <DayTypeCell ymd={dayYmd} turn={turn} />
        </div>
      </div>
    );
  }

  if (row === "INTENSIDAD") {
    return (
      <div className="h-8 w-full flex items-center">
        <MicroCell
          ymd={dayYmd}
          turn={turn}
          weekStart={weekStart}
          getMicroValue={getMicroValue}
          setMicroValue={setMicroValue}
        />
      </div>
    );
  }

  if (row === "RIVAL") {
    const flag = getDayFlag(dayYmd, turn);
    if (flag.kind !== "PARTIDO") {
      return (
        <div className="h-8 w-full rounded-md border px-2 text-xs flex items-center text-gray-400 italic">
          —
        </div>
      );
    }
    return (
      <div className="h-8 w-full flex items-center">
        <PartidoCell
          ymd={dayYmd}
          turn={turn}
          weekStart={weekStart}
          getDayFlag={getDayFlag}
          setDayFlag={setDayFlag}
        />
      </div>
    );
  }

  if (row === sessionNameRowId) {
    return (
      <SessionNameInput
        dayYmd={dayYmd}
        turn={turn}
        row={row}
        original={original}
        value={value}
        stageCell={stageCell}
      />
    );
  }

  if (row === "LUGAR") {
    return (
      <LugarInput dayYmd={dayYmd} turn={turn} row={row} value={value} stageCell={stageCell} />
    );
  }

  if (row === "HORA") {
    return <HoraInput dayYmd={dayYmd} turn={turn} row={row} value={value} stageCell={stageCell} />;
  }

  if (row === "VIDEO") {
    return (
      <VideoInput
        dayYmd={dayYmd}
        turn={turn}
        row={row}
        value={value}
        stageCell={stageCell}
        setVideoPreview={setVideoPreview}
      />
    );
  }

  return null;
}

type BaseMetaProps = {
  dayYmd: string;
  turn: TurnKey;
  row: MetaRowId;
  value: string | undefined;
  stageCell: (dayYmd: string, turn: TurnKey, row: string, text: string) => void;
};

type SessionNameInputProps = BaseMetaProps & {
  original: string;
};

function SessionNameInput({ dayYmd, turn, row, value, original, stageCell }: SessionNameInputProps) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value, dayYmd, turn, row]);

  const commit = () => {
    const v = (local || "").trim();
    if (v !== (original || "")) stageCell(dayYmd, turn, row, v);
  };

  return (
    <input
      className="h-8 w-full rounded-md border px-2 text-xs"
      placeholder="Nombre de sesión (ej: Sesión 7 TM)"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function LugarInput({ dayYmd, turn, row, value, stageCell }: BaseMetaProps) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value, dayYmd, turn, row]);

  return (
    <input
      list="places-datalist"
      className="h-8 w-full rounded-md border px-2 text-xs"
      placeholder="Lugar (texto libre o sugerencias)"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => stageCell(dayYmd, turn, row, (local || "").trim())}
    />
  );
}

function HoraInput({ dayYmd, turn, row, value, stageCell }: BaseMetaProps) {
  const hhmm = /^[0-9]{2}:[0-9]{2}$/.test(value || "") ? value : "";
  const [local, setLocal] = useState(hhmm || "");

  useEffect(() => {
    setLocal(hhmm || "");
  }, [hhmm, dayYmd, turn, row]);

  const commit = () => {
    const v = (local || "").trim();
    stageCell(dayYmd, turn, row, v);
  };

  return (
    <input
      type="time"
      className="h-8 w-full rounded-md border px-2 text-xs"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

type VideoInputProps = BaseMetaProps & {
  setVideoPreview: (payload: { title: string; zone?: string | null; videoUrl?: string | null } | null) => void;
};

function VideoInput({ dayYmd, turn, row, value, stageCell, setVideoPreview }: VideoInputProps) {
  const parsed = parseVideoValue(value || "");
  const [isEditing, setIsEditing] = useState(!(parsed.label || parsed.url));
  const [localLabel, setLocalLabel] = useState(parsed.label);
  const [localUrl, setLocalUrl] = useState(parsed.url);

  useEffect(() => {
    setLocalLabel(parsed.label);
    setLocalUrl(parsed.url);
  }, [dayYmd, turn, row, value]);

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-1">
        {parsed.url ? (
          <button
            type="button"
            className="text-[12px] underline text-emerald-700 truncate"
            title={parsed.label || "Video"}
            onClick={() =>
              setVideoPreview({
                title: parsed.label || "Video sesión",
                zone: null,
                videoUrl: parsed.url,
              })
            }
          >
            {parsed.label || "Video"}
          </button>
        ) : (
          <span className="text-[12px] text-gray-500 truncate">{parsed.label}</span>
        )}
        <div className="flex items-center gap-1">
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
            onClick={() => stageCell(dayYmd, turn, row, "")}
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
        className="h-8 w-[45%] rounded-md border px-2 text-xs"
        placeholder="Título"
        value={localLabel}
        onChange={(e) => setLocalLabel(e.target.value)}
      />
      <input
        type="url"
        className="h-8 w-[55%] rounded-md border px-2 text-xs"
        placeholder="https://…"
        value={localUrl}
        onChange={(e) => setLocalUrl(e.target.value)}
      />
      <button
        type="button"
        className="h-8 px-2 rounded border text-[11px] hover:bg-gray-50"
        onClick={() => {
          stageCell(dayYmd, turn, row, joinVideoValue(localLabel, localUrl));
          setIsEditing(false);
        }}
        title="Listo"
      >
        ✓
      </button>
    </div>
  );
}
