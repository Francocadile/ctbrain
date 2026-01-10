"use client";

import React from "react";

import VideoPlayerModal from "@/components/training/VideoPlayerModal";
import type { FieldDiagramState, DiagramObject, PitchBackground, FieldDiagramTemplateKey } from "@/lib/sessions/fieldDiagram";
import { saveSessionExerciseTemplate } from "@/lib/api/exercises";
import { uploadDiagramPng, uploadDiagramBackground } from "@/lib/api/uploads";
import { FieldDiagramCanvas, exportDiagramToPng } from "./FieldDiagramCanvas";

async function readImageFileAsDataUrl(file: File): Promise<string> {
  const reader = new FileReader();
  return await new Promise<string>((resolve, reject) => {
    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });
}

async function resizeImageDataUrl(
  dataUrl: string,
  maxWidth = 1200,
  maxHeight = 1200,
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);

        if (!isFinite(scale) || scale <= 0) {
          resolve(dataUrl);
          return;
        }

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngDataUrl = canvas.toDataURL("image/png");
        resolve(pngDataUrl || dataUrl);
      } catch (err) {
        reject(err as Error);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

async function readAndResizeImageFile(file: File): Promise<string> {
  const dataUrl = await readImageFileAsDataUrl(file);
  if (!dataUrl) return dataUrl;
  return await resizeImageDataUrl(dataUrl);
}

type ExerciseForCard = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  material?: string;
  diagram?: FieldDiagramState;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
  libraryExerciseId?: string;
};

type ExerciseSectionCardProps = {
  index: number;
  sessionId: string;
  exerciseIndex: number;
  exercise: ExerciseForCard;
  readOnly: boolean;
  onChange: (patch: Partial<ExerciseForCard>) => void;
  onDelete?: () => void;
  onOpenLibraryPicker?: () => void;
  showLibraryPickerButton?: boolean;
  isVideoUrl?: (url?: string | null) => boolean;
  routineNode?: React.ReactNode;
};

export function ExerciseSectionCard(props: ExerciseSectionCardProps) {
  const {
    index,
    sessionId,
    exerciseIndex,
    exercise,
    readOnly,
    onChange,
    onDelete,
    onOpenLibraryPicker,
    showLibraryPickerButton,
    isVideoUrl,
    routineNode,
  } = props;

  const title = exercise.title?.trim() || "Sin título";
  const headerLabel = `TAREA #${String(index + 1).padStart(2, "0")}`;
  const video = isVideoUrl?.(exercise.videoUrl);

  const [showDiagramEditor, setShowDiagramEditor] = React.useState(false);
  const [draftDiagram, setDraftDiagram] = React.useState<FieldDiagramState | null>(
    null,
  );
  const editorSvgRef = React.useRef<SVGSVGElement | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isSavingDiagram, setIsSavingDiagram] = React.useState(false);
  const [saveStage, setSaveStage] = React.useState<
    "idle" | "exporting" | "uploading" | "done" | "error"
  >("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveWarning, setSaveWarning] = React.useState<string | null>(null);
  const [templateStatus, setTemplateStatus] = React.useState<
    "idle" | "saving" | "done" | "error"
  >("idle");
  const [templateError, setTemplateError] = React.useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);

  const hasDiagram = !!exercise.diagram;

  const ensureInitialDiagram = (): FieldDiagramState =>
    exercise.diagram ?? {
      version: 1,
      background: { kind: "template", key: "half_pitch" },
      objects: [],
    };

  const setBackground = (bg: PitchBackground | FieldDiagramTemplateKey) => {
    setDraftDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        background: bg,
      };
    });
  };

  const openEditor = () => {
    if (readOnly) return;
    const initial = ensureInitialDiagram();
    setDraftDiagram(initial);
    setSelectedId(null);
    setIsSavingDiagram(false);
    setSaveStage("idle");
    setSaveError(null);
    setSaveWarning(null);
    setShowDiagramEditor(true);
  };

  const closeEditor = () => {
    setShowDiagramEditor(false);
    setDraftDiagram(null);
    setSelectedId(null);
    setIsSavingDiagram(false);
    setSaveStage("idle");
    setSaveError(null);
    setSaveWarning(null);
  };

  const saveDiagram = async () => {
    if (!draftDiagram) {
      closeEditor();
      return;
    }

    setIsSavingDiagram(true);
    setSaveStage("exporting");
    setSaveError(null);
    setSaveWarning(null);

    let renderedImage: string | undefined;

    if (editorSvgRef.current) {
      try {
        renderedImage = await exportDiagramToPng(editorSvgRef.current);
      } catch (err) {
        console.error("No se pudo exportar el diagrama a PNG", err);
        setIsSavingDiagram(false);
        setSaveStage("error");
        setSaveError("No se pudo exportar el diagrama a PNG. Podés reintentar.");
        return;
      }
    }

    if (!renderedImage) {
      setIsSavingDiagram(false);
      setSaveStage("error");
      setSaveError("No se generó la imagen PNG del diagrama. Podés reintentar.");
      return;
    }

    setSaveStage("uploading");

    let renderedImageUrl: string | undefined;

    try {
      const { url } = await uploadDiagramPng({
        sessionId,
        exerciseIndex,
        pngDataUrl: renderedImage,
      });
      renderedImageUrl = url;
    } catch (err) {
      console.error(
        "No se pudo subir el PNG del diagrama a Blob",
        err,
      );
      setSaveWarning(
        "No se pudo subir a la nube. Se guardó local en la sesión.",
      );
    }

    onChange({
      diagram: {
        ...draftDiagram,
        renderedImageUrl,
        renderedImage,
      },
    });

    setIsSavingDiagram(false);
    setSaveStage("done");

    setTimeout(() => {
      closeEditor();
    }, 700);
  };

  const selectedObject: DiagramObject | null = React.useMemo(() => {
    if (!draftDiagram || !selectedId) return null;
    return (draftDiagram.objects.find((o) => o.id === selectedId) as DiagramObject) ?? null;
  }, [draftDiagram, selectedId]);

  const updateDraft = (updater: (draft: FieldDiagramState) => void) => {
    setDraftDiagram((prev) => {
      if (!prev) return prev;
      const next: FieldDiagramState = {
        ...prev,
        objects: prev.objects.slice(),
      };
      updater(next);
      return next;
    });
  };

  const updateSelectedObject = (updater: (obj: DiagramObject) => void) => {
    if (!draftDiagram || !selectedId) return;
    updateDraft((draft) => {
      const idx = draft.objects.findIndex((o) => o.id === selectedId);
      if (idx === -1) return;
      const obj = { ...(draft.objects[idx] as DiagramObject) };
      updater(obj);
      draft.objects[idx] = obj;
    });
  };

  const duplicateSelected = () => {
    if (!draftDiagram || !selectedId) return;
    updateDraft((draft) => {
      const idx = draft.objects.findIndex((o) => o.id === selectedId);
      if (idx === -1) return;
      const base = draft.objects[idx] as DiagramObject;
      const newId = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const clone: any = JSON.parse(JSON.stringify(base));
      clone.id = newId;

      const shift = (v: number) => Math.min(1, Math.max(0, v + 0.02));

      if (clone.type === "arrow" || clone.type === "line") {
        clone.x1 = shift(clone.x1);
        clone.y1 = shift(clone.y1);
        clone.x2 = shift(clone.x2);
        clone.y2 = shift(clone.y2);
      } else {
        clone.x = shift(clone.x);
        clone.y = shift(clone.y);
      }

      draft.objects.splice(idx + 1, 0, clone as DiagramObject);
      setSelectedId(newId);
    });
  };

  const bringToFront = () => {
    if (!draftDiagram || !selectedId) return;
    updateDraft((draft) => {
      const idx = draft.objects.findIndex((o) => o.id === selectedId);
      if (idx === -1) return;
      const [obj] = draft.objects.splice(idx, 1);
      draft.objects.push(obj);
    });
  };

  const sendToBack = () => {
    if (!draftDiagram || !selectedId) return;
    updateDraft((draft) => {
      const idx = draft.objects.findIndex((o) => o.id === selectedId);
      if (idx === -1) return;
      const [obj] = draft.objects.splice(idx, 1);
      draft.objects.unshift(obj);
    });
  };

  const deleteSelectedFromPanel = () => {
    if (!draftDiagram || !selectedId) return;
    updateDraft((draft) => {
      draft.objects = draft.objects.filter((o) => o.id !== selectedId);
    });
    setSelectedId(null);
  };

  const clearPitch = () => {
    if (!draftDiagram) return;
    if (!window.confirm("¿Limpiar la cancha? Esto eliminará todos los objetos.")) {
      return;
    }
    setDraftDiagram({ ...draftDiagram, objects: [] });
    setSelectedId(null);
  };

  React.useEffect(() => {
    if (!showDiagramEditor || readOnly) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSavingDiagram) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (event.key === "Escape") {
        if (selectedId) {
          event.preventDefault();
          setSelectedId(null);
        } else {
          event.preventDefault();
          closeEditor();
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedId) return;
        event.preventDefault();
        deleteSelectedFromPanel();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "d" || event.key === "D")) {
        if (!selectedId) return;
        event.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDiagramEditor, readOnly, isSavingDiagram, selectedId, duplicateSelected, deleteSelectedFromPanel, closeEditor]);

  return (
    <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 text-sm">
          <span className="font-semibold tracking-wide text-slate-800">
            {headerLabel}
          </span>
          <span className="text-slate-500 truncate max-w-[260px] sm:max-w-xs">
            {title}
          </span>
          {exercise.libraryExerciseId && (
            <span className="mt-1 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 sm:mt-0">
              Plantilla vinculada
            </span>
          )}
        </div>
        {!readOnly && onDelete && (
          <button
            type="button"
            className="text-xs font-medium text-red-600 hover:text-red-700"
            onClick={onDelete}
          >
            Eliminar
          </button>
        )}
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr),minmax(0,1.4fr)]">
        {/* Columna izquierda: diagrama de cancha + imagen / video */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border bg-slate-900/90 p-2">
            {exercise.diagram?.renderedImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exercise.diagram.renderedImageUrl}
                alt={title}
                className="aspect-video w-full rounded-lg object-contain bg-black/40"
              />
            ) : exercise.diagram?.renderedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exercise.diagram.renderedImage}
                alt={title}
                className="aspect-video w-full rounded-lg object-contain bg-black/40"
              />
            ) : hasDiagram ? (
              <FieldDiagramCanvas
                value={exercise.diagram as FieldDiagramState}
                readOnly
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-emerald-900/40 text-center text-[11px] text-emerald-100">
                Diagrama de cancha no definido.
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                onClick={openEditor}
              >
                {hasDiagram ? "Editar cancha" : "Crear ejercicio"}
              </button>
            </div>
          )}

          {!readOnly && (
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-slate-700">Imagen del ejercicio</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="block w-full text-[11px] text-slate-700 file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-0.5 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50 disabled:opacity-40"
                  disabled={readOnly}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const dataUrl = await readAndResizeImageFile(file);
                      if (!dataUrl) return;

                      const { url } = await uploadDiagramBackground({
                        sessionId,
                        pngDataUrl: dataUrl,
                      });

                      onChange({ imageUrl: url });
                    } catch (err) {
                      console.error("No se pudo subir la imagen del ejercicio", err);
                      alert("No se pudo subir la imagen del ejercicio. Reintentá más tarde.");
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
                {exercise.imageUrl && (
                  <div className="mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={exercise.imageUrl}
                      alt={title}
                      className="max-h-40 w-full rounded-md border object-contain bg-slate-100"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-slate-700">Video del ejercicio (YouTube)</label>
                <input
                  type="text"
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  value={exercise.videoUrl ?? ""}
                  onChange={(e) => onChange({ videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              {showLibraryPickerButton && onOpenLibraryPicker && (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  onClick={onOpenLibraryPicker}
                >
                  Insertar desde biblioteca
                </button>
              )}
              {!readOnly && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-emerald-600 bg-white px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                    disabled={templateStatus === "saving"}
                    onClick={async () => {
                      if (readOnly) return;

                      const name =
                        exercise.title?.trim() || "Ejercicio sin título";
                      const zone =
                        exercise.space?.trim() || exercise.kind?.trim() || null;
                      const videoUrl = exercise.videoUrl?.trim() || null;

                      const rawPlayers = (exercise as any).players ?? null;
                      let players: number | string | null = null;
                      if (typeof rawPlayers === "number") {
                        players = rawPlayers;
                      } else if (typeof rawPlayers === "string") {
                        const n = parseInt(
                          rawPlayers.replace(/\D+/g, ""),
                          10,
                        );
                        players = Number.isFinite(n) ? n : rawPlayers;
                      }

                      if (exercise.libraryExerciseId) {
                        const ok = window.confirm(
                          "Esto actualizará la plantilla vinculada. ¿Continuar?",
                        );
                        if (!ok) return;
                      }

                      setTemplateStatus("saving");
                      setTemplateError(null);

                      try {
                        const saved = await saveSessionExerciseTemplate({
                          id: exercise.libraryExerciseId,
                          name,
                          zone,
                          videoUrl,
                          sessionMeta: {
                            type: exercise.kind || "",
                            space: exercise.space || "",
                            players,
                            duration: exercise.duration || "",
                            description: exercise.description || "",
                            imageUrl: exercise.imageUrl || "",
                            diagram: exercise.diagram ?? null,
                          },
                        });

                        onChange({ libraryExerciseId: saved.id });
                        setTemplateStatus("done");
                        setTimeout(() => setTemplateStatus("idle"), 1200);
                      } catch (err: any) {
                        console.error("No se pudo guardar la plantilla", err);
                        setTemplateError(
                          err?.message ||
                            "No se pudo guardar la plantilla. Reintentá.",
                        );
                        setTemplateStatus("error");
                      }
                    }}
                  >
                    {templateStatus === "saving"
                      ? "Guardando plantilla…"
                      : templateStatus === "done"
                        ? "Plantilla guardada"
                        : "Guardar ejercicio (incluye cancha)"}
                  </button>
                  {templateError && (
                    <span className="text-red-600">
                      {templateError}
                    </span>
                  )}
                  {!exercise.libraryExerciseId ? null : (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => onChange({ libraryExerciseId: undefined })}
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: meta + descripción */}
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="font-medium text-slate-700">Título del ejercicio</label>
              {!readOnly && video && exercise.videoUrl && (
                <button
                  type="button"
                  className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline"
                  onClick={() => setIsVideoModalOpen(true)}
                >
                  Ver video
                </button>
              )}
            </div>
            <input
              type="text"
              className="w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
              value={exercise.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Nombre corto y claro"
              disabled={readOnly}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Tipo</label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
                value={exercise.kind}
                onChange={(e) => onChange({ kind: e.target.value })}
                placeholder="Técnico, táctico, físico..."
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Espacio</label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
                value={exercise.space}
                onChange={(e) => onChange({ space: e.target.value })}
                placeholder="1/2 pista, 3/4, campo entero..."
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Jugadores</label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
                value={exercise.players}
                onChange={(e) => onChange({ players: e.target.value })}
                placeholder="4x4 + porteros, etc."
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Duración</label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
                value={exercise.duration}
                onChange={(e) => onChange({ duration: e.target.value })}
                placeholder="Ej. 4x4' + 2' pausa"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="font-medium text-slate-700">Material</label>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
                value={exercise.material ?? ""}
                onChange={(e) => onChange({ material: e.target.value })}
                placeholder="Conos, picas, balones, petos..."
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700">Descripción</label>
            <textarea
              className="min-h-[88px] w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-50"
              value={exercise.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Explica la dinámica, objetivos y variantes principales."
              disabled={readOnly}
            />
          </div>

          {routineNode && (
            <div className="mt-1">{routineNode}</div>
          )}
        </div>
      </div>

      {showDiagramEditor && draftDiagram && !readOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Editor de cancha · {headerLabel}
              </h2>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
                onClick={closeEditor}
                disabled={isSavingDiagram && saveStage !== "error"}
              >
                Cerrar
              </button>
            </div>

            <div className="md:grid md:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)] md:gap-4 flex flex-col gap-3">
              <FieldDiagramCanvas
                value={draftDiagram}
                onChange={setDraftDiagram}
                externalSvgRef={editorSvgRef}
                selectedId={selectedId}
                onSelect={setSelectedId}
                showToolbar={!isSavingDiagram}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 space-y-4">
                <div>
                  <p className="mb-2 font-semibold text-slate-900">Fondo</p>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 hover:bg-slate-100"
                        disabled={isSavingDiagram}
                        onClick={() =>
                          setBackground({ kind: "template", key: "full_pitch" })
                        }
                      >
                        Campo completo
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 hover:bg-slate-100"
                        disabled={isSavingDiagram}
                        onClick={() =>
                          setBackground({ kind: "template", key: "half_pitch" })
                        }
                      >
                        Medio campo
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 hover:bg-slate-100"
                        disabled={isSavingDiagram}
                        onClick={() =>
                          setBackground({ kind: "template", key: "free_space" })
                        }
                      >
                        Espacio libre
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700">
                        Subir imagen de fondo
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="block w-full text-[11px] text-slate-700 file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-0.5 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50 disabled:opacity-40"
                        disabled={isSavingDiagram}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            const dataUrl = await readAndResizeImageFile(file);
                            if (!dataUrl) return;

                            const { url } = await uploadDiagramBackground({
                              sessionId,
                              pngDataUrl: dataUrl,
                            });

                            setBackground({ kind: "image", url });
                          } catch (err) {
                            console.error("No se pudo subir la imagen de fondo", err);
                            alert("No se pudo subir la imagen de fondo. Reintentá más tarde.");
                          } finally {
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-semibold text-slate-900">Propiedades</p>
                  {!selectedObject ? (
                  <p className="text-[11px] text-slate-500">
                    Seleccioná un objeto en la cancha para editar sus propiedades.
                  </p>
                  ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium uppercase text-slate-500">
                      Tipo: {selectedObject.type}
                    </p>

                    {selectedObject.type === "player" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-700">
                            Label
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-md border px-2 py-1 text-[11px]"
                            value={selectedObject.label ?? ""}
                            onChange={(e) =>
                              updateSelectedObject((obj) => {
                                if (obj.type !== "player") return;
                                obj.label = e.target.value;
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-700">
                            Equipo
                          </span>
                          <div className="inline-flex rounded-md border bg-white text-[11px]">
                            <button
                              type="button"
                              className={`px-2 py-0.5 rounded-l-md ${
                                selectedObject.team === "A"
                                  ? "bg-emerald-600 text-white"
                                  : "text-slate-700"
                              }`}
                              onClick={() =>
                                updateSelectedObject((obj) => {
                                  if (obj.type !== "player") return;
                                  obj.team = "A";
                                  if (!obj.label) obj.label = "A";
                                })
                              }
                            >
                              A
                            </button>
                            <button
                              type="button"
                              className={`px-2 py-0.5 rounded-r-md border-l ${
                                selectedObject.team === "B"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-700"
                              }`}
                              onClick={() =>
                                updateSelectedObject((obj) => {
                                  if (obj.type !== "player") return;
                                  obj.team = "B";
                                  if (!obj.label) obj.label = "B";
                                })
                              }
                            >
                              B
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedObject.type === "text" && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-700">
                          Texto
                        </label>
                        <textarea
                          className="w-full rounded-md border px-2 py-1 text-[11px] min-h-[56px]"
                          value={selectedObject.text}
                          onChange={(e) =>
                            updateSelectedObject((obj) => {
                              if (obj.type !== "text") return;
                              obj.text = e.target.value;
                            })
                          }
                        />
                      </div>
                    )}

                    {selectedObject.type === "arrow" && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={!!selectedObject.dashed}
                            onChange={(e) =>
                              updateSelectedObject((obj) => {
                                if (obj.type !== "arrow") return;
                                obj.dashed = e.target.checked;
                              })
                            }
                          />
                          Línea discontinua
                        </label>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-700">
                            Grosor
                          </label>
                          <select
                            className="w-full rounded-md border px-2 py-1 text-[11px]"
                            value={selectedObject.thickness ?? 1.2}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 1.2;
                              updateSelectedObject((obj) => {
                                if (obj.type !== "arrow") return;
                                obj.thickness = v;
                              });
                            }}
                          >
                            <option value={0.8}>Fina</option>
                            <option value={1.2}>Media</option>
                            <option value={1.8}>Gruesa</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                      <p className="text-[11px] font-medium text-slate-700">
                        Acciones rápidas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] hover:bg-slate-100 disabled:opacity-40"
                          disabled={!selectedObject || isSavingDiagram}
                          onClick={duplicateSelected}
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] hover:bg-slate-100 disabled:opacity-40"
                          disabled={!selectedObject || isSavingDiagram}
                          onClick={bringToFront}
                        >
                          Traer al frente
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] hover:bg-slate-100 disabled:opacity-40"
                          disabled={!selectedObject || isSavingDiagram}
                          onClick={sendToBack}
                        >
                          Enviar atrás
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-40"
                          disabled={!selectedObject || isSavingDiagram}
                          onClick={deleteSelectedFromPanel}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                </div>

                <div className="mt-3 border-t border-slate-200 pt-2">
                  <button
                    type="button"
                    className="rounded-md border border-red-400 bg-white px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    disabled={isSavingDiagram}
                    onClick={clearPitch}
                  >
                    Limpiar cancha
                  </button>
                </div>
              </div>
            </div>

            <p
              className={`mt-2 text-[11px] text-slate-500 ${
                isSavingDiagram ? "opacity-60" : ""
              }`}
            >
              Atajos: Esc = cerrar/deseleccionar · Supr/Backspace = borrar · Ctrl/Cmd + D = duplicar
            </p>

            {saveError && (
              <div className="mt-3 text-[11px] text-red-600">
                {saveError}
              </div>
            )}
            {saveWarning && !saveError && (
              <div className="mt-3 text-[11px] text-amber-600">
                {saveWarning}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                className="rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                onClick={closeEditor}
                disabled={isSavingDiagram && saveStage !== "error"}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white hover:bg-black disabled:opacity-40"
                onClick={saveDiagram}
                disabled={isSavingDiagram && saveStage !== "error"}
              >
                {saveStage === "exporting"
                  ? "Exportando…"
                  : saveStage === "uploading"
                    ? "Subiendo…"
                    : saveStage === "done"
                      ? "Guardado"
                      : saveStage === "error"
                        ? "Reintentar"
                        : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoPlayerModal
        open={isVideoModalOpen && !!exercise.videoUrl}
        onClose={() => setIsVideoModalOpen(false)}
        title={exercise.title?.trim() || "Ejercicio"}
        zone={exercise.space?.trim() || exercise.kind?.trim() || null}
        videoUrl={exercise.videoUrl}
      />
    </section>
  );
}
