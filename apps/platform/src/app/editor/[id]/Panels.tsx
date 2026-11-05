"use client";

import { WIDGET_LABELS, type Layer, type LayerType } from "@mocci/shared";

const WIDGET_ORDER: LayerType[] = [
  "gift-alert",
  "chat",
  "leaderboard",
  "goal",
  "text",
  "image",
  "game-canvas",
];

export function Palette({ onAdd }: { onAdd: (type: LayerType) => void }) {
  return (
    <aside className="w-52 shrink-0 overflow-y-auto border-r border-zinc-800 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Widget</h2>
      <div className="flex flex-col gap-1.5">
        {WIDGET_ORDER.map((type) => (
          <button
            key={type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("mocci/widget", type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onAdd(type)}
            className="cursor-grab rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm transition hover:border-violet-500 hover:bg-zinc-800 active:cursor-grabbing"
          >
            {WIDGET_LABELS[type]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-600">Klik atau drag ke kanvas.</p>
    </aside>
  );
}

interface LayerListProps {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, dir: 1 | -1) => void;
  onDelete: (id: string) => void;
}

export function LayerList({ layers, selectedId, onSelect, onReorder, onDelete }: LayerListProps) {
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex); // paling depan dulu

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Layer
      </span>
      {sorted.length === 0 && (
        <span className="text-xs text-zinc-600">Kosong — tambah widget dari panel kiri.</span>
      )}
      {sorted.map((l) => (
        <div
          key={l.id}
          className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
            l.id === selectedId
              ? "border-violet-500 bg-violet-600/20"
              : "border-zinc-800 bg-zinc-900"
          }`}
        >
          <button onClick={() => onSelect(l.id)} className="text-zinc-200 hover:text-white">
            {WIDGET_LABELS[l.type]}
          </button>
          <button
            onClick={() => onReorder(l.id, 1)}
            className="text-zinc-500 hover:text-white"
            title="Bawa ke depan"
          >
            ↑
          </button>
          <button
            onClick={() => onReorder(l.id, -1)}
            className="text-zinc-500 hover:text-white"
            title="Bawa ke belakang"
          >
            ↓
          </button>
          <button onClick={() => onDelete(l.id)} className="text-red-400 hover:text-red-300" title="Hapus">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
