"use client";

import { useEffect, useRef, useState } from "react";
import { WidgetRenderer, WIDGET_LABELS, type Layer, type LayerType, type Scene } from "@mocci/shared";
import { DEFAULT_SIZE, type LayerPatch } from "./editor-constants";

type ResizeMode = "nw" | "ne" | "sw" | "se";

interface EditorCanvasProps {
  scene: Scene;
  selectedId: string | null;
  snap: boolean;
  onSelect: (id: string | null) => void;
  updateLayer: (id: string, patch: LayerPatch) => void;
  pushHistory: () => void;
  onAddLayer: (type: LayerType, x?: number, y?: number) => void;
}

const SNAP_GRID = 8;
const MIN_SIZE = 40;

export function EditorCanvas({
  scene,
  selectedId,
  snap,
  onSelect,
  updateLayer,
  pushHistory,
  onAddLayer,
}: EditorCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Skala kanvas agar pas dengan ruang tersedia.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const s = Math.min(
        (el.clientWidth - 8) / scene.canvas.width,
        (el.clientHeight - 8) / scene.canvas.height,
      );
      setScale(Math.max(0.1, s));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.canvas.width, scene.canvas.height]);

  // ── Drag & resize via pointer events ───────────────────────────────────────
  const startInteraction = (e: React.PointerEvent, layer: Layer, mode: "move" | ResizeMode) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(layer.id);
    pushHistory();

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: layer.x, y: layer.y, w: layer.width, h: layer.height };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;

      if (mode === "move") {
        let nx = orig.x + dx;
        let ny = orig.y + dy;
        if (snap) {
          nx = Math.round(nx / SNAP_GRID) * SNAP_GRID;
          ny = Math.round(ny / SNAP_GRID) * SNAP_GRID;
        }
        updateLayer(layer.id, { x: nx, y: ny });
        return;
      }

      // Resize dari sudut.
      let width = orig.w + (mode.includes("e") ? dx : -dx);
      let height = orig.h + (mode.includes("s") ? dy : -dy);
      if (snap) {
        width = Math.round(width / SNAP_GRID) * SNAP_GRID;
        height = Math.round(height / SNAP_GRID) * SNAP_GRID;
      }
      width = Math.max(MIN_SIZE, width);
      height = Math.max(MIN_SIZE, height);
      const patch: LayerPatch = { width, height };
      if (mode.includes("w")) patch.x = orig.x + (orig.w - width);
      if (mode.includes("n")) patch.y = orig.y + (orig.h - height);
      updateLayer(layer.id, patch);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Drop widget dari palette ───────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("mocci/widget") as LayerType;
    if (!type || !(type in DEFAULT_SIZE)) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const size = DEFAULT_SIZE[type];
    const x = Math.round((e.clientX - rect.left) / scale - size.w / 2);
    const y = Math.round((e.clientY - rect.top) / scale - size.h / 2);
    onAddLayer(type, Math.max(0, x), Math.max(0, y));
  };

  const sorted = [...scene.layers].sort((a, b) => a.zIndex - b.zIndex);
  const handleSize = 12 / scale; // ukuran handle konstan secara visual
  const borderWidth = 2 / scale;

  return (
    <div ref={wrapRef} className="flex h-full items-center justify-center overflow-hidden">
      <div
        className="relative shadow-2xl ring-1 ring-zinc-800"
        style={{ width: scene.canvas.width * scale, height: scene.canvas.height * scale }}
        onPointerDown={() => onSelect(null)}
      >
        <div
          ref={canvasRef}
          className="absolute left-0 top-0 bg-zinc-900"
          style={{
            width: scene.canvas.width,
            height: scene.canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {sorted.map((layer) => {
            const isSelected = layer.id === selectedId;
            return (
              <div
                key={layer.id}
                className="absolute"
                style={{
                  left: layer.x,
                  top: layer.y,
                  width: layer.width,
                  height: layer.height,
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                  opacity: layer.opacity,
                  zIndex: layer.zIndex + 1,
                }}
                onPointerDown={(e) => startInteraction(e, layer, "move")}
              >
                {/* Konten widget non-interaktif di editor (WYSIWYG saja). */}
                <div className="pointer-events-none h-full w-full select-none">
                  <WidgetRenderer layer={layer} />
                </div>

                {isSelected && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 border-violet-400"
                      style={{ borderWidth, borderStyle: "solid" }}
                    />
                    <span className="pointer-events-none absolute -top-6 left-0 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                      {WIDGET_LABELS[layer.type]}
                    </span>
                    {(["nw", "ne", "sw", "se"] as const).map((mode) => (
                      <div
                        key={mode}
                        className="absolute z-10 cursor-nwse-resize rounded-sm border border-white bg-violet-600"
                        style={{
                          width: handleSize,
                          height: handleSize,
                          left: mode.includes("w") ? -handleSize / 2 : undefined,
                          right: mode.includes("e") ? -handleSize / 2 : undefined,
                          top: mode.includes("n") ? -handleSize / 2 : undefined,
                          bottom: mode.includes("s") ? -handleSize / 2 : undefined,
                          cursor:
                            mode === "nw" || mode === "se" ? "nwse-resize" : "nesw-resize",
                        }}
                        onPointerDown={(e) => startInteraction(e, layer, mode)}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
