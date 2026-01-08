"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DayFlag, TurnKey } from "@/lib/planner-contract";
import { cellKey } from "@/lib/planner-contract";
import { getDayTypeTextColor } from "@/lib/planner-daytype";
import EditableCell from "./EditableCell";
import MetaInput, { type MetaRowId } from "./MetaInput";

export type TurnEditorProps = {
  turn: TurnKey;
  orderedDays: string[];
  weekStart: string;
  contentRows: readonly string[];
  metaRows: readonly MetaRowId[];
  sessionNameRowId: string;
  labelForRow: (id: string) => string;
  getDayFlag: (ymd: string, turn: TurnKey) => DayFlag;
  getMicroValue: (ymd: string, turn: TurnKey) => any;
  setDayFlag: (ymd: string, turn: TurnKey, df: DayFlag) => Promise<void> | void;
  setMicroValue: (ymd: string, turn: TurnKey, value: any) => Promise<void> | void;
  findCell: (dayYmd: string, turn: TurnKey, row: string) => any;
  stageCell: (dayYmd: string, turn: TurnKey, row: string, text: string) => void;
  pending: Record<string, string>;
  humanDayUTC: (ymd: string) => string;
  places: string[];
  setVideoPreview: (payload: { title: string; zone?: string | null; videoUrl?: string | null } | null) => void;
  dayTypeColorFor: (ymd: string, turn: TurnKey) => string | undefined;
  dayTypes: import("@/lib/planner-daytype").DayTypeDef[];
  dayTypeKeyFor: (ymd: string, turn: TurnKey) => import("@/lib/planner-daytype").DayTypeId | "";
  setDayTypeAssignment: (ymd: string, turn: TurnKey, key: import("@/lib/planner-daytype").DayTypeId | "") => void;
};

const COL_LABEL_W = 120;
const DAY_MIN_W = 120;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
      {children}
    </div>
  );
}

export default function TurnEditor({
  turn,
  orderedDays,
  weekStart,
  contentRows,
  metaRows,
  sessionNameRowId,
  labelForRow,
  getDayFlag,
  getMicroValue,
  setDayFlag,
  setMicroValue,
  findCell,
  stageCell,
  pending,
  humanDayUTC,
  places,
  setVideoPreview,
  dayTypeColorFor,
  dayTypes,
  dayTypeKeyFor,
  setDayTypeAssignment,
}: TurnEditorProps) {
  return (
    <>
      {/* Encabezado de días */}
      <div
        className="grid text-xs"
        style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
      >
        <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600"></div>
        {orderedDays.map((ymd) => {
          const color = dayTypeColorFor(ymd, turn) || "#f9fafb";
          const textColor = getDayTypeTextColor(color);
          return (
            <div
              key={`${turn}-${ymd}`}
              className="border-b px-2 py-1.5"
              style={{ backgroundColor: color, color: textColor }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
              <div className="text-[10px] text-gray-500">{ymd}</div>
            </div>
          );
        })}
      </div>

      {/* DETALLES */}
      <SectionLabel>DETALLES</SectionLabel>
      {metaRows.map((rowName) => (
        <div
          key={`${turn}-meta-${rowName}`}
          className="grid items-center"
          style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
        >
          <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">
            {rowName}
          </div>
          {orderedDays.map((ymd) => {
            const existing = findCell(ymd, turn, rowName);
            const k = cellKey(ymd, turn, rowName);
            const pendingValue = pending[k];
            return (
              <div
                key={`${ymd}-${turn}-${rowName}`}
                className="p-1"
              >
                <MetaInput
                  dayYmd={ymd}
                  turn={turn}
                  row={rowName}
                  sessionNameRowId={sessionNameRowId}
                  existing={existing}
                  pendingValue={pendingValue}
                  weekStart={weekStart}
                  getDayFlag={getDayFlag}
                  getMicroValue={getMicroValue}
                  setDayFlag={setDayFlag}
                  setMicroValue={setMicroValue}
                  stageCell={stageCell}
                  setVideoPreview={setVideoPreview}
                  places={places}
                  dayTypes={dayTypes}
                  dayTypeKeyFor={dayTypeKeyFor}
                  setDayTypeAssignment={setDayTypeAssignment}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* CONTENIDOS */}
      <div className="border-t">
        <div className="px-2 py-1 text-[10px] text-gray-600 border-b bg-gray-50">
          Escribí el <b>contenido general</b> (títulos). El detalle se edita en <b>“Cargar ejercicios de la sesión”</b>.
        </div>
        <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
          {turn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
        </div>
        {contentRows.map((rowName) => (
          <div
            key={`${turn}-${rowName}`}
            className="grid items-stretch"
            style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
          >
            <div className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600 whitespace-pre-line">
              {labelForRow(rowName)}
            </div>
            {orderedDays.map((ymd) => {
              const existing = findCell(ymd, turn, rowName);
              const k = cellKey(ymd, turn, rowName);
              const staged = pending[k];
              const initialText = staged !== undefined ? staged : existing?.title ?? "";
              const flag = getDayFlag(ymd, turn);
              const sessionHref = existing?.id ? `/ct/sessions/${existing.id}` : "";
              const color = dayTypeColorFor(ymd, turn) || "#ffffff";
              return (
                <div
                  key={`${ymd}-${turn}-${rowName}`}
                  className="p-1"
                  style={{ backgroundColor: color }}
                >
                  <EditableCell
                    dayYmd={ymd}
                    turn={turn}
                    row={rowName}
                    initialText={initialText}
                    flag={flag}
                    sessionHref={sessionHref}
                    onCommit={(txt) => stageCell(ymd, turn, rowName, txt)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
