"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultLayerConfig,
  EventFeedProvider,
  type Layer,
  type LayerType,
  type Scene,
} from "@mocci/shared";
import { DEFAULT_SIZE, type LayerPatch } from "./editor-constants";
import { EditorCanvas } from "./EditorCanvas";
import { Inspector } from "./Inspector";
import { LayerList, Palette } from "./Panels";

const SAVE_DEBOUNCE_MS = 800;

interface EditorClientProps {
  overlayId: string;
  name: string;
  publicToken: string;
  initialScene: Scene;
}

export function EditorClient({ overlayId, name, publicToken, initialScene }: EditorClientProps) {
  const [scene, setSceneState] = useState<Scene>(initialScene);
  const sceneRef = useRef(scene);
  const setScene = useCallback((s: Scene) => {
    sceneRef.current = s;
    setSceneState(s);
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [snap, setSnap] = useState(true);
  const [, bump] = useState(0); // memicu re-render untuk status tombol undo/redo

  // ── History (undo/redo) ────────────────────────────────────────────────────
  const past = useRef<Scene[]>([]);
  const future = useRef<Scene[]>([]);

  const pushHistory = useCallback(() => {
    past.current.push(sceneRef.current);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    bump((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(sceneRef.current);
    setScene(prev);
    bump((t) => t + 1);
  }, [setScene]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(sceneRef.current);
    setScene(next);
    bump((t) => t + 1);
  }, [setScene]);

  // ── Mutasi layer ───────────────────────────────────────────────────────────
  const updateLayer = useCallback(
    (id: string, patch: LayerPatch) => {
      setScene({
        ...sceneRef.current,
        layers: sceneRef.current.layers.map((l) => {
          if (l.id !== id) return l;
          const { config, ...transform } = patch;
          return {
            ...l,
            ...transform,
            config: config ? { ...l.config, ...config } : l.config,
          } as Layer;
        }),
      });
    },
    [setScene],
  );

  const addLayer = useCallback(
    (type: LayerType, x?: number, y?: number) => {
      pushHistory();
      const size = DEFAULT_SIZE[type];
      const { canvas } = sceneRef.current;
      const layer = {
        id: crypto.randomUUID(),
        type,
        x: x ?? Math.round((canvas.width - size.w) / 2),
        y: y ?? Math.round((canvas.height - size.h) / 2),
        width: size.w,
        height: size.h,
        rotation: 0,
        opacity: 1,
        zIndex: sceneRef.current.layers.length,
        config: defaultLayerConfig(type),
      } as Layer;
      setScene({ ...sceneRef.current, layers: [...sceneRef.current.layers, layer] });
      setSelectedId(layer.id);
    },
    [pushHistory, setScene],
  );

  const deleteLayer = useCallback(
    (id: string) => {
      pushHistory();
      setScene({ ...sceneRef.current, layers: sceneRef.current.layers.filter((l) => l.id !== id) });
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [pushHistory, setScene],
  );

  const reorderLayer = useCallback(
    (id: string, dir: 1 | -1) => {
      pushHistory();
      setScene({
        ...sceneRef.current,
        layers: sceneRef.current.layers.map((l) =>
          l.id === id ? { ...l, zIndex: Math.max(0, l.zIndex + dir) } : l,
        ),
      });
    },
    [pushHistory, setScene],
  );

  // ── Shortcut keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteLayer(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, undo, redo, deleteLayer]);

  // ── Autosave (debounce) ────────────────────────────────────────────────────
  const lastSaved = useRef(JSON.stringify(initialScene));
  useEffect(() => {
    const json = JSON.stringify(scene);
    if (json === lastSaved.current) return;

    setSaveState("saving");
    const t = setTimeout(() => {
      fetch(`/api/overlays/${overlayId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          lastSaved.current = json;
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [scene, overlayId]);

  const copyOverlayUrl = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/overlay/${publicToken}`);
  };

  const selected = scene.layers.find((l) => l.id === selectedId) ?? null;
  const saveLabel =
    saveState === "saving" ? "Menyimpan…" : saveState === "error" ? "Gagal simpan!" : "Tersimpan";

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-zinc-400 transition hover:text-white" title="Kembali">
            ←
          </Link>
          <span className="font-semibold">{name}</span>
          <span
            className={`text-xs ${saveState === "error" ? "text-red-400" : saveState === "saving" ? "text-amber-400" : "text-emerald-400"}`}
          >
            {saveLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={undo}
            disabled={past.current.length === 0}
            className="rounded-lg border border-zinc-800 px-2.5 py-1.5 transition hover:border-zinc-600 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={future.current.length === 0}
            className="rounded-lg border border-zinc-800 px-2.5 py-1.5 transition hover:border-zinc-600 disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Snap 8px
          </label>
          <button
            onClick={copyOverlayUrl}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs transition hover:border-violet-500 hover:text-violet-300"
            title="Salin URL overlay untuk OBS"
          >
            Copy URL Overlay
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Palette onAdd={(type) => addLayer(type)} />

        <div className="min-w-0 flex-1 p-6">
          <EventFeedProvider>
            <EditorCanvas
              scene={scene}
              selectedId={selectedId}
              snap={snap}
              onSelect={setSelectedId}
              updateLayer={updateLayer}
              pushHistory={pushHistory}
              onAddLayer={addLayer}
            />
          </EventFeedProvider>
        </div>

        <Inspector
          layer={selected}
          onLive={updateLayer}
          pushHistory={pushHistory}
          onDelete={deleteLayer}
          onReorder={reorderLayer}
        />
      </div>

      <div className="border-t border-zinc-800">
        <LayerList
          layers={scene.layers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onReorder={reorderLayer}
          onDelete={deleteLayer}
        />
      </div>
    </div>
  );
}
