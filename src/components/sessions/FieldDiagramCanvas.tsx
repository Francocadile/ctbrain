"use client";

import React from "react";
import type {
  FieldDiagramState,
  DiagramObject,
  DiagramPlayer,
  DiagramCone,
  DiagramGoal,
  DiagramBall,
  DiagramArrow,
  DiagramText,
  DiagramRect,
  DiagramCircleShape,
  FieldDiagramTemplateKey,
  PitchBackground,
} from "@/lib/sessions/fieldDiagram";

type FieldDiagramCanvasProps = {
  value: FieldDiagramState;
  readOnly?: boolean;
  onChange?: (next: FieldDiagramState) => void;
  externalSvgRef?: React.MutableRefObject<SVGSVGElement | null>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showToolbar?: boolean;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 60;

type PresetName = "11v11" | "7v7" | "rondo4v2";

const makeId = () => `obj_${Math.random().toString(36).slice(2, 10)}`;

const makePreset = (name: PresetName): DiagramObject[] => {
  const objects: DiagramObject[] = [];

  const addPlayer = (team: "A" | "B", x: number, y: number, index: number) => {
    const id = makeId();
    const label = `${team}${index}`;
    objects.push({
      id,
      type: "player",
      team,
      x,
      y,
      label,
    } as DiagramPlayer);
  };

  const addBall = (x: number, y: number) => {
    const id = makeId();
    objects.push({
      id,
      type: "ball",
      x,
      y,
    } as DiagramBall);
  };

  switch (name) {
    case "11v11": {
      let a = 1;
      let b = 1;

      // Equipo A (izquierda)
      addPlayer("A", 0.08, 0.5, a++); // Portero
      [0.18, 0.34, 0.66, 0.82].forEach((y) => addPlayer("A", 0.25, y, a++));
      [0.2, 0.4, 0.6, 0.8].forEach((y) => addPlayer("A", 0.45, y, a++));
      [0.35, 0.65].forEach((y) => addPlayer("A", 0.65, y, a++));

      // Equipo B (derecha, espejado)
      addPlayer("B", 0.92, 0.5, b++); // Portero
      [0.18, 0.34, 0.66, 0.82].forEach((y) => addPlayer("B", 0.75, y, b++));
      [0.2, 0.4, 0.6, 0.8].forEach((y) => addPlayer("B", 0.55, y, b++));
      [0.35, 0.65].forEach((y) => addPlayer("B", 0.35, y, b++));

      addBall(0.5, 0.5);
      break;
    }
    case "7v7": {
      let a = 1;
      let b = 1;

      // Equipo A (izquierda) 1-2-3-1
      addPlayer("A", 0.1, 0.5, a++); // Portero
      [0.3, 0.7].forEach((y) => addPlayer("A", 0.28, y, a++));
      [0.25, 0.5, 0.75].forEach((y) => addPlayer("A", 0.5, y, a++));
      addPlayer("A", 0.7, 0.5, a++); // Delantero

      // Equipo B (derecha) 1-2-3-1 espejado
      addPlayer("B", 0.9, 0.5, b++); // Portero
      [0.3, 0.7].forEach((y) => addPlayer("B", 0.72, y, b++));
      [0.25, 0.5, 0.75].forEach((y) => addPlayer("B", 0.5, y, b++));
      addPlayer("B", 0.3, 0.5, b++); // Delantero

      addBall(0.5, 0.5);
      break;
    }
    case "rondo4v2": {
      let a = 1;
      let b = 1;

      // Cuadrado externo (equipo A)
      addPlayer("A", 0.35, 0.35, a++);
      addPlayer("A", 0.65, 0.35, a++);
      addPlayer("A", 0.35, 0.65, a++);
      addPlayer("A", 0.65, 0.65, a++);

      // Dos dentro (equipo B)
      addPlayer("B", 0.5, 0.45, b++);
      addPlayer("B", 0.5, 0.55, b++);

      addBall(0.5, 0.35);
      break;
    }
  }

  return objects;
};

export function FieldDiagramCanvas({
  value,
  readOnly,
  onChange,
  externalSvgRef,
  selectedId: controlledSelectedId,
  onSelect,
  showToolbar = true,
}: FieldDiagramCanvasProps) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [internalSelectedId, setInternalSelectedId] = React.useState<
    string | null
  >(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const dragOffset = React.useRef<{ dx: number; dy: number } | null>(null);

  const selectedId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;

  const setSelected = (id: string | null) => {
    if (onSelect) onSelect(id);
    if (controlledSelectedId === undefined) {
      setInternalSelectedId(id);
    }
  };

  const update = (updater: (draft: FieldDiagramState) => void) => {
    if (!onChange) return;
    const next: FieldDiagramState = {
      ...value,
      objects: value.objects.slice(),
    };
    updater(next);
    onChange(next);
  };

  const setBackground = (bg: PitchBackground | FieldDiagramTemplateKey) => {
    if (readOnly) return;
    update((draft) => {
      draft.background = bg;
    });
  };

  const addObject = (type: DiagramObject["type"], team?: "A" | "B") => {
    if (readOnly) return;
    const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cx = 0.5;
    const cy = 0.5;

    let obj: DiagramObject;
    switch (type) {
      case "player":
        {
          const playerTeam: "A" | "B" = team ?? "A";
          const existing = value.objects.filter(
            (o) => o.type === "player" && (o as DiagramPlayer).team === playerTeam,
          ).length;
          const nextIndex = existing + 1;
        obj = {
          id,
          type: "player",
          team: playerTeam,
          x: cx,
          y: cy,
          label: `${playerTeam}${nextIndex}`,
        } as DiagramPlayer;
        }
        break;
      case "cone":
        obj = { id, type: "cone", x: cx, y: cy } as DiagramCone;
        break;
      case "goal":
        obj = { id, type: "goal", x: cx, y: cy } as DiagramGoal;
        break;
      case "ball":
        obj = { id, type: "ball", x: cx, y: cy } as DiagramBall;
        break;
      case "rect":
        obj = {
          id,
          type: "rect",
          x: cx,
          y: cy,
          width: 0.22,
          height: 0.16,
          stroke: "#fef9c3",
          fill: "#facc15",
          opacity: 0.35,
        } as DiagramRect;
        break;
      case "circle":
        obj = {
          id,
          type: "circle",
          x: cx,
          y: cy,
          r: 0.09,
          stroke: "#fee2e2",
          fill: "#ef4444",
          opacity: 0.35,
        } as DiagramCircleShape;
        break;
      case "arrow":
        obj = {
          id,
          type: "arrow",
          x1: cx - 0.1,
          y1: cy,
          x2: cx + 0.1,
          y2: cy,
          dashed: false,
        } as DiagramArrow;
        break;
      case "text":
        obj = {
          id,
          type: "text",
          x: cx,
          y: cy,
          text: "Texto",
        } as DiagramText;
        break;
      default:
        return;
    }

    update((draft) => {
      draft.objects.push(obj);
    });
    setSelected(id);
  };

  const applyPreset = (name: PresetName) => {
    if (readOnly) return;
    const hasObjects = value.objects.length > 0;
    if (
      hasObjects &&
      !window.confirm(
        "Aplicar preset reemplazará el diagrama actual. ¿Continuar?",
      )
    ) {
      return;
    }

    const objects = makePreset(name);
    update((draft) => {
      draft.objects = objects;
    });
    setSelected(null);
  };

  const deleteSelected = () => {
    if (readOnly || !selectedId) return;
    update((draft) => {
      draft.objects = draft.objects.filter((o) => o.id !== selectedId);
    });
    setSelected(null);
  };

  const getPointer = (evt: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const px = (evt.clientX - rect.left) / rect.width;
    const py = (evt.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, px)),
      y: Math.min(1, Math.max(0, py)),
    };
  };

  const onObjectMouseDown = (
    evt: React.MouseEvent<SVGElement, MouseEvent>,
    obj: DiagramObject,
  ) => {
    if (readOnly) return;
    evt.stopPropagation();
    setSelected(obj.id);
    const p = getPointer(evt as any);
    if (obj.type === "arrow") {
      // Arrastramos todo el vector manteniendo el offset del punto medio
      const mx = (obj.x1 + obj.x2) / 2;
      const my = (obj.y1 + obj.y2) / 2;
      dragOffset.current = { dx: mx - p.x, dy: my - p.y };
    } else {
      dragOffset.current = { dx: obj.x - p.x, dy: obj.y - p.y } as any;
    }
    setDraggingId(obj.id);
  };

  const onSvgMouseMove = (evt: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (readOnly) return;
    if (!draggingId || !dragOffset.current) return;
    const p = getPointer(evt);

    update((draft) => {
      const idx = draft.objects.findIndex((o) => o.id === draggingId);
      if (idx === -1) return;
      const obj = draft.objects[idx];
      if (obj.type === "arrow") {
        const { dx, dy } = dragOffset.current!;
        const mx = p.x + dx;
        const my = p.y + dy;
        const vx = obj.x2 - obj.x1;
        const vy = obj.y2 - obj.y1;
        const hx = vx / 2;
        const hy = vy / 2;
        obj.x1 = mx - hx;
        obj.y1 = my - hy;
        obj.x2 = mx + hx;
        obj.y2 = my + hy;
      } else {
        const { dx, dy } = dragOffset.current!;
        obj.x = Math.min(1, Math.max(0, p.x + dx));
        obj.y = Math.min(1, Math.max(0, p.y + dy));
      }
    });
  };

  const endDrag = () => {
    if (!readOnly && draggingId) {
      const snap = (v: number, step = 0.02) => {
        const snapped = Math.round(v / step) * step;
        return Math.min(1, Math.max(0, snapped));
      };
      update((draft) => {
        const idx = draft.objects.findIndex((o) => o.id === draggingId);
        if (idx === -1) return;
        const obj = draft.objects[idx];
        if (obj.type === "arrow") {
          obj.x1 = snap(obj.x1);
          obj.y1 = snap(obj.y1);
          obj.x2 = snap(obj.x2);
          obj.y2 = snap(obj.y2);
        } else {
          obj.x = snap(obj.x);
          obj.y = snap(obj.y);
        }
      });
    }
    setDraggingId(null);
    dragOffset.current = null;
  };

  const onSvgClickEmpty = () => {
    if (readOnly) return;
    setSelected(null);
  };

  const renderBackground = () => {
    const bg = value.background;
    const normalized: PitchBackground =
      typeof bg === "string"
        ? { kind: "template", key: bg as FieldDiagramTemplateKey }
        : bg;

    if (normalized.kind === "image") {
      return (
        <g>
          <image
            href={normalized.url}
            x={0}
            y={0}
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      );
    }

    const isHalf = normalized.key === "half_pitch";
    return (
      <g>
        <rect
          x={0}
          y={0}
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          fill="#065f46"
        />
        <rect
          x={2}
          y={2}
          width={VIEWBOX_WIDTH - 4}
          height={VIEWBOX_HEIGHT - 4}
          fill="#047857"
          stroke="#ecfdf5"
          strokeWidth={0.6}
        />
        {/* Línea de medio campo */}
        {!isHalf && (
          <line
            x1={VIEWBOX_WIDTH / 2}
            y1={2}
            x2={VIEWBOX_WIDTH / 2}
            y2={VIEWBOX_HEIGHT - 2}
            stroke="#ecfdf5"
            strokeWidth={0.5}
          />
        )}
        {/* Círculo central */}
        {!isHalf && (
          <circle
            cx={VIEWBOX_WIDTH / 2}
            cy={VIEWBOX_HEIGHT / 2}
            r={7}
            stroke="#ecfdf5"
            strokeWidth={0.5}
            fill="none"
          />
        )}
        {/* Área pequeña lado izquierdo */}
        <rect
          x={2}
          y={VIEWBOX_HEIGHT / 2 - 8}
          width={6}
          height={16}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth={0.5}
        />
        {/* Área pequeña lado derecho (solo campo completo) */}
        {!isHalf && (
          <rect
            x={VIEWBOX_WIDTH - 8}
            y={VIEWBOX_HEIGHT / 2 - 8}
            width={6}
            height={16}
            fill="none"
            stroke="#ecfdf5"
            strokeWidth={0.5}
          />
        )}
      </g>
    );
  };

  const renderObject = (obj: DiagramObject) => {
    const sel = obj.id === selectedId;
    const common = {
      onMouseDown: (e: React.MouseEvent<SVGElement, MouseEvent>) =>
        onObjectMouseDown(e, obj),
      style: { cursor: readOnly ? "default" : "pointer" },
    } as const;

    const cx = obj.type === "arrow" ? 0 : obj.x * VIEWBOX_WIDTH;
    const cy = obj.type === "arrow" ? 0 : obj.y * VIEWBOX_HEIGHT;

    switch (obj.type) {
      case "player": {
        const fill = obj.team === "A" ? "#22c55e" : "#3b82f6";
        return (
          <g key={obj.id} {...common}>
            <circle
              cx={obj.x * VIEWBOX_WIDTH}
              cy={obj.y * VIEWBOX_HEIGHT}
              r={2.4}
              fill={fill}
              stroke={sel ? "#fbbf24" : "#f9fafb"}
              strokeWidth={sel ? 0.9 : 0.5}
            />
            {obj.label && (
              <text
                x={obj.x * VIEWBOX_WIDTH}
                y={obj.y * VIEWBOX_HEIGHT + 4}
                textAnchor="middle"
                fontSize={3}
                fill="#f9fafb"
              >
                {obj.label}
              </text>
            )}
          </g>
        );
      }
      case "cone":
        return (
          <polygon
            key={obj.id}
            points={`${obj.x * VIEWBOX_WIDTH},${obj.y * VIEWBOX_HEIGHT - 3} ${
              obj.x * VIEWBOX_WIDTH - 2
            },${obj.y * VIEWBOX_HEIGHT + 2} ${
              obj.x * VIEWBOX_WIDTH + 2
            },${obj.y * VIEWBOX_HEIGHT + 2}`}
            fill="#f97316"
            stroke={sel ? "#fbbf24" : "#f9fafb"}
            strokeWidth={sel ? 0.9 : 0.5}
            {...common}
          />
        );
      case "goal":
        return (
          <rect
            key={obj.id}
            x={obj.x * VIEWBOX_WIDTH - 3}
            y={obj.y * VIEWBOX_HEIGHT - 2}
            width={6}
            height={4}
            fill="#f9fafb"
            stroke={sel ? "#fbbf24" : "#e5e7eb"}
            strokeWidth={sel ? 0.9 : 0.5}
            {...common}
          />
        );
      case "ball":
        return (
          <circle
            key={obj.id}
            cx={obj.x * VIEWBOX_WIDTH}
            cy={obj.y * VIEWBOX_HEIGHT}
            r={1.6}
            fill="#f9fafb"
            stroke={sel ? "#fbbf24" : "#111827"}
            strokeWidth={sel ? 0.9 : 0.7}
            {...common}
          />
        );
      case "rect": {
        const width = obj.width * VIEWBOX_WIDTH;
        const height = obj.height * VIEWBOX_HEIGHT;
        const x = obj.x * VIEWBOX_WIDTH - width / 2;
        const y = obj.y * VIEWBOX_HEIGHT - height / 2;
        return (
          <rect
            key={obj.id}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={obj.fill ?? "#facc15"}
            stroke={sel ? "#fbbf24" : obj.stroke ?? "#fef9c3"}
            strokeWidth={sel ? 1 : 0.8}
            opacity={obj.opacity ?? 0.4}
            {...common}
          />
        );
      }
      case "circle": {
        const radius = obj.r * VIEWBOX_WIDTH;
        return (
          <circle
            key={obj.id}
            cx={obj.x * VIEWBOX_WIDTH}
            cy={obj.y * VIEWBOX_HEIGHT}
            r={radius}
            fill={obj.fill ?? "#ef4444"}
            stroke={sel ? "#fbbf24" : obj.stroke ?? "#fee2e2"}
            strokeWidth={sel ? 1 : 0.8}
            opacity={obj.opacity ?? 0.4}
            {...common}
          />
        );
      }
      case "arrow":
        return (
          <g key={obj.id} {...common}>
            <line
              x1={obj.x1 * VIEWBOX_WIDTH}
              y1={obj.y1 * VIEWBOX_HEIGHT}
              x2={obj.x2 * VIEWBOX_WIDTH}
              y2={obj.y2 * VIEWBOX_HEIGHT}
              stroke={sel ? "#e5e7eb" : "#f9fafb"}
              strokeWidth={obj.thickness ?? 1.2}
              strokeDasharray={obj.dashed ? "3,3" : undefined}
            />
            {/* cabeza de flecha */}
            <polygon
              points={computeArrowHeadPoints(obj)}
              fill={sel ? "#e5e7eb" : "#f9fafb"}
            />
          </g>
        );
      case "text":
        return (
          <text
            key={obj.id}
            x={obj.x * VIEWBOX_WIDTH}
            y={obj.y * VIEWBOX_HEIGHT}
            textAnchor="middle"
            fontSize={3}
            fill={sel ? "#fef9c3" : "#f9fafb"}
            {...common}
          >
            {obj.text}
          </text>
        );
      default:
        return null;
    }
  };

  const computeArrowHeadPoints = (arrow: DiagramArrow): string => {
    const x1 = arrow.x1 * VIEWBOX_WIDTH;
    const y1 = arrow.y1 * VIEWBOX_HEIGHT;
    const x2 = arrow.x2 * VIEWBOX_WIDTH;
    const y2 = arrow.y2 * VIEWBOX_HEIGHT;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = 4;
    const a1 = angle - Math.PI / 7;
    const a2 = angle + Math.PI / 7;
    const x3 = x2 - length * Math.cos(a1);
    const y3 = y2 - length * Math.sin(a1);
    const x4 = x2 - length * Math.cos(a2);
    const y4 = y2 - length * Math.sin(a2);
    return `${x2},${y2} ${x3},${y3} ${x4},${y4}`;
  };

  return (
    <div className="flex flex-col gap-2 text-[11px] text-slate-100">
      {!readOnly && showToolbar && (
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-200">Cancha</span>
          <select
            className="rounded-md border border-emerald-500 bg-emerald-900 px-2 py-0.5 text-[11px] text-emerald-50"
            value={
              typeof value.background === "string"
                ? value.background
                : value.background.kind === "template"
                  ? value.background.key
                  : "full_pitch"
            }
            onChange={(e) => setBackground(e.target.value as FieldDiagramTemplateKey)}
          >
            <option value="full_pitch">Campo completo</option>
            <option value="half_pitch">1/2 campo</option>
          </select>

          <span className="ml-2 text-slate-300">Objetos:</span>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("player", "A")}
          >
            + Jugador A
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("player", "B")}
          >
            + Jugador B
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("cone")}
          >
            + Cono
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("goal")}
          >
            + Arco
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("ball")}
          >
            + Balón
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("arrow")}
          >
            + Flecha
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("text")}
          >
            + Texto
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("rect")}
          >
            + Cuadrado
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => addObject("circle")}
          >
            + Círculo
          </button>

          <span className="ml-3 font-medium text-slate-200">Presets:</span>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => applyPreset("11v11")}
          >
            11v11
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => applyPreset("7v7")}
          >
            7v7
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700"
            onClick={() => applyPreset("rondo4v2")}
          >
            Rondo 4v2
          </button>

          <button
            type="button"
            className="ml-auto rounded-md border border-red-500 px-2 py-0.5 text-red-100 hover:bg-red-600/40 disabled:opacity-40"
            onClick={deleteSelected}
            disabled={!selectedId}
          >
            Eliminar seleccionado
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-emerald-700 bg-emerald-900">
        <svg
          ref={(el) => {
            svgRef.current = el;
            if (externalSvgRef) {
              externalSvgRef.current = el;
            }
          }}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="h-56 w-full touch-none select-none"
          onMouseMove={onSvgMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onClick={onSvgClickEmpty}
        >
          {renderBackground()}
          {value.objects.map((obj) => renderObject(obj))}
        </svg>
      </div>
    </div>
  );
}

export async function exportDiagramToPng(
  svgElement: SVGSVGElement,
  width = 800,
  height = 480,
): Promise<string> {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  if (!source.match(/^<svg[^>]+xmlns=/)) {
    source = source.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }
  if (!source.match(/xmlns:xlink=/)) {
    source = source.replace(
      "<svg",
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"',
    );
  }

  const blob = new Blob([source], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  return await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("No 2D context available"));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngDataUrl = canvas.toDataURL("image/png");
        URL.revokeObjectURL(url);
        resolve(pngDataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err as Error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };
    img.src = url;
  });
}
