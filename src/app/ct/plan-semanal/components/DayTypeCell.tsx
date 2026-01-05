"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TurnKey } from "@/lib/planner-contract";
import { DEFAULT_DAY_TYPES, type DayTypeDef, type DayTypeId, DEFAULT_DAY_TYPE_IDS } from "@/lib/planner-daytype";

export type DayTypeCellProps = {
  ymd: string;
  turn: TurnKey;
  value?: DayTypeId | "";
  onSelectedChange?: (nextId: DayTypeId | "") => void;
};

// Local-storage helpers (UI-only persistence, optional)
const TYPES_KEY = "planner.daytypes.v1";
const ASSIGN_KEY = "planner.daytype.assignments.v1";

type AssignmentMap = Record<string, DayTypeId | undefined>;

type StoredTypes = DayTypeDef[];

function loadTypes(): DayTypeDef[] {
  if (typeof window === "undefined") return DEFAULT_DAY_TYPES;
  try {
    const raw = window.localStorage.getItem(TYPES_KEY);
    if (!raw) return DEFAULT_DAY_TYPES;
    const parsed = JSON.parse(raw) as StoredTypes;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_DAY_TYPES;
    return parsed;
  } catch {
    return DEFAULT_DAY_TYPES;
  }
}

function saveTypes(list: DayTypeDef[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TYPES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function loadAssignments(): AssignmentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ASSIGN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AssignmentMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAssignments(map: AssignmentMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ASSIGN_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getDayTypeColorFor(ymd: string, turn: TurnKey): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const rawAssign = window.localStorage.getItem(ASSIGN_KEY);
    if (!rawAssign) return undefined;
    const assignments = JSON.parse(rawAssign) as AssignmentMap;
    const key = `${ymd}::${turn}`;
    const typeId = assignments[key];
    if (!typeId) return undefined;

    const rawTypes = window.localStorage.getItem(TYPES_KEY);
    const types = rawTypes ? (JSON.parse(rawTypes) as StoredTypes) : DEFAULT_DAY_TYPES;
    const found = types.find((t) => t.id === typeId);
    return found?.color;
  } catch {
    return undefined;
  }
}

export default function DayTypeCell({ ymd, turn, value, onSelectedChange }: DayTypeCellProps) {
  const [types, setTypes] = useState<DayTypeDef[]>(() => DEFAULT_DAY_TYPES);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("bg-sky-50");
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    const loadedTypes = loadTypes();
    const loadedAssign = loadAssignments();
    setTypes(loadedTypes);
    setAssignments(loadedAssign);
  }, []);

  const key = useMemo(() => `${ymd}::${turn}`, [ymd, turn]);
  const selectedId = value !== undefined ? value : assignments[key];

  const selectedDef = types.find((t) => t.id === selectedId);

  const updateSelection = (id: DayTypeId | "") => {
    onSelectedChange?.(id);
    // If controlado externamente, no tocamos assignments locales
    if (value !== undefined) return;
    setAssignments((prev) => {
      const next: AssignmentMap = { ...prev };
      if (!id) delete next[key];
      else next[key] = id;
      saveAssignments(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("planner-daytype-assignments-updated"));
      }
      return next;
    });
  };

  const updateTypes = (updater: (prev: DayTypeDef[]) => DayTypeDef[]) => {
    setTypes((prev) => {
      const next = updater(prev);
      saveTypes(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("planner-daytypes-updated"));
      }
      return next;
    });
  };

  const colorOptions = [
    "bg-sky-50",
    "bg-red-50",
    "bg-amber-50",
    "bg-emerald-50",
    "bg-violet-50",
    "bg-blue-50",
    "bg-yellow-50",
    "bg-gray-50",
  ];

  const handleAddType = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = label.toUpperCase().replace(/\s+/g, "_");
    updateTypes((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [...prev, { id, label, color: newColor }];
    });
    setNewLabel("");
    setNewColor("bg-sky-50");
  };

  const handleDeleteType = (id: DayTypeId) => {
    // Prevent deleting if currently selected anywhere o si es default
    if (DEFAULT_DAY_TYPE_IDS.includes(id)) return;
    const isUsed = Object.values(assignments).includes(id);
    if (isUsed) return;
    updateTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLabelChange = (id: DayTypeId, label: string) => {
    updateTypes((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  };

  const handleColorChange = (id: DayTypeId, color: string) => {
    updateTypes((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  };

  // Cerrar popover en click fuera
  useEffect(() => {
    if (!editing) return;
    function onDown(ev: MouseEvent) {
      if (!panelRef.current) return;
      if (panelRef.current.contains(ev.target as Node)) return;
      setEditing(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [editing]);

  return (
    <div className="relative flex items-center gap-1 text-[11px]">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-[10px] text-gray-500 whitespace-nowrap">Tipo trabajo</span>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <div className={`w-3 h-3 rounded-full border ${selectedDef?.color || "bg-gray-50"}`} />
          <select
            className="h-7 flex-1 rounded-md border px-1.5 text-[11px] min-w-0"
            value={selectedId || ""}
            onChange={(e) => updateSelection(e.target.value as DayTypeId)}
          >
            <option value="">—</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded border text-[11px] hover:bg-gray-50"
        onClick={() => setEditing((v) => !v)}
        title="Configurar tipos"
      >
        ⚙️
      </button>

      {editing && (
        <div
          ref={panelRef}
          className="absolute z-20 top-full right-0 mt-1 w-80 rounded-lg border bg-white shadow-lg p-2 text-[11px]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">Configurar tipos de trabajo</span>
            <button
              type="button"
              className="h-5 w-5 flex items-center justify-center rounded border hover:bg-gray-50"
              onClick={() => setEditing(false)}
            >
              ✕
            </button>
          </div>

          <div className="space-y-1 max-h-40 overflow-auto mb-2">
            {types.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded-full border ${t.color}`} />
                <input
                  className="flex-1 h-6 rounded border px-1 text-[11px]"
                  value={t.label}
                  onChange={(e) => handleLabelChange(t.id, e.target.value)}
                />
                <select
                  className="h-6 rounded border px-1 text-[11px]"
                  value={t.color}
                  onChange={(e) => handleColorChange(t.id, e.target.value)}
                >
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="h-6 w-6 flex items-center justify-center rounded border text-[11px] hover:bg-gray-50"
                  onClick={() => handleDeleteType(t.id)}
                  title={DEFAULT_DAY_TYPE_IDS.includes(t.id) ? "No se puede eliminar un tipo por defecto" : "Eliminar (si no está en uso)"}
                  disabled={DEFAULT_DAY_TYPE_IDS.includes(t.id)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>

          <div className="border-t pt-1 mt-1 space-y-1">
            <div className="text-[10px] text-gray-500">Agregar nuevo tipo</div>
            <div className="flex items-center gap-1">
              <input
                className="flex-1 h-6 rounded border px-1 text-[11px]"
                placeholder="Nombre (ej: Activación)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <select
                className="h-6 rounded border px-1 text-[11px]"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              >
                {colorOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-6 px-2 rounded border text-[11px] hover:bg-gray-50"
                onClick={handleAddType}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

