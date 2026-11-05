"use client";

import { WIDGET_LABELS, type Layer } from "@mocci/shared";
import type { LayerPatch } from "./editor-constants";

interface InspectorProps {
  layer: Layer | null;
  onLive: (id: string, patch: LayerPatch) => void;
  pushHistory: () => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, dir: 1 | -1) => void;
}

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white outline-none focus:border-violet-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-400";

/** Input angka: pushHistory saat fokus (sebelum edit), update live saat mengetik. */
function NumberField({
  label,
  value,
  onLive,
  pushHistory,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onLive: InspectorProps["onLive"];
  pushHistory: () => void;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onFocus={pushHistory}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls}
      />
    </div>
  );
}

export function Inspector({ layer, onLive, pushHistory, onDelete, onReorder }: InspectorProps) {
  if (!layer) {
    return (
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-800 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Properti</h2>
        <p className="text-sm text-zinc-600">Pilih widget di kanvas untuk mengedit.</p>
      </aside>
    );
  }

  const cfg = layer.config as Record<string, unknown>;
  const setCfg = (key: string, value: unknown) => onLive(layer.id, { config: { [key]: value } });

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {WIDGET_LABELS[layer.type]}
        </h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => onReorder(layer.id, 1)}
            className="rounded border border-zinc-800 px-1.5 py-0.5 hover:border-zinc-600"
            title="Bawa ke depan"
          >
            ↑
          </button>
          <button
            onClick={() => onReorder(layer.id, -1)}
            className="rounded border border-zinc-800 px-1.5 py-0.5 hover:border-zinc-600"
            title="Bawa ke belakang"
          >
            ↓
          </button>
          <button
            onClick={() => onDelete(layer.id)}
            className="rounded border border-zinc-800 px-1.5 py-0.5 text-red-400 hover:border-red-500"
            title="Hapus (Del)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Transform ─────────────────────────────────────────────────────── */}
      <section className="mb-5 grid grid-cols-2 gap-2.5">
        <NumberField
          label="X"
          value={layer.x}
          onLive={onLive}
          pushHistory={pushHistory}
          onChange={(n) => onLive(layer.id, { x: n })}
        />
        <NumberField
          label="Y"
          value={layer.y}
          onLive={onLive}
          pushHistory={pushHistory}
          onChange={(n) => onLive(layer.id, { y: n })}
        />
        <NumberField
          label="Lebar"
          value={layer.width}
          onLive={onLive}
          pushHistory={pushHistory}
          onChange={(n) => onLive(layer.id, { width: Math.max(40, n) })}
        />
        <NumberField
          label="Tinggi"
          value={layer.height}
          onLive={onLive}
          pushHistory={pushHistory}
          onChange={(n) => onLive(layer.id, { height: Math.max(40, n) })}
        />
        <NumberField
          label="Rotasi (°)"
          value={layer.rotation}
          onLive={onLive}
          pushHistory={pushHistory}
          onChange={(n) => onLive(layer.id, { rotation: n })}
        />
        <NumberField
          label="Opasitas (0–1)"
          value={layer.opacity}
          step={0.1}
          onLive={onLive}
          pushHistory={pushHistory}
          onChange={(n) => onLive(layer.id, { opacity: Math.min(1, Math.max(0, n)) })}
        />
      </section>

      {/* ── Config per tipe widget ────────────────────────────────────────── */}
      <section className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Konten</h3>

        {layer.type === "text" && (
          <>
            <div>
              <label className={labelCls}>Teks</label>
              <textarea
                value={String(cfg.text ?? "")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("text", e.target.value)}
                className={`${inputCls} min-h-16`}
              />
            </div>
            <NumberField
              label="Ukuran font"
              value={Number(cfg.fontSize ?? 32)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("fontSize", n)}
            />
            <div>
              <label className={labelCls}>Warna</label>
              <input
                type="color"
                value={String(cfg.color ?? "#ffffff")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("color", e.target.value)}
                className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(cfg.bold)}
                onChange={(e) => setCfg("bold", e.target.checked)}
              />
              Tebal
            </label>
            <div>
              <label className={labelCls}>Perataan</label>
              <select
                value={String(cfg.align ?? "center")}
                onChange={(e) => setCfg("align", e.target.value)}
                className={inputCls}
              >
                <option value="left">Kiri</option>
                <option value="center">Tengah</option>
                <option value="right">Kanan</option>
              </select>
            </div>
          </>
        )}

        {layer.type === "gift-alert" && (
          <>
            <div>
              <label className={labelCls}>Template teks</label>
              <input
                value={String(cfg.textTemplate ?? "")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("textTemplate", e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-[10px] text-zinc-600">Variabel: {"{user} {gift} {count}"}</p>
            </div>
            <NumberField
              label="Durasi tampil (ms)"
              value={Number(cfg.durationMs ?? 4000)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("durationMs", n)}
            />
            <div>
              <label className={labelCls}>Warna aksen</label>
              <input
                type="color"
                value={String(cfg.accentColor ?? "#a855f7")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("accentColor", e.target.value)}
                className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800"
              />
            </div>
          </>
        )}

        {layer.type === "chat" && (
          <>
            <NumberField
              label="Maks. pesan"
              value={Number(cfg.maxMessages ?? 20)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("maxMessages", n)}
            />
            <NumberField
              label="Ukuran font"
              value={Number(cfg.fontSize ?? 16)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("fontSize", n)}
            />
            <div>
              <label className={labelCls}>Warna teks</label>
              <input
                type="color"
                value={String(cfg.textColor ?? "#ffffff")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("textColor", e.target.value)}
                className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800"
              />
            </div>
            <div>
              <label className={labelCls}>Latar belakang (CSS)</label>
              <input
                value={String(cfg.backgroundColor ?? "")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("backgroundColor", e.target.value)}
                className={inputCls}
              />
            </div>
          </>
        )}

        {layer.type === "leaderboard" && (
          <>
            <div>
              <label className={labelCls}>Judul</label>
              <input
                value={String(cfg.title ?? "")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("title", e.target.value)}
                className={inputCls}
              />
            </div>
            <NumberField
              label="Jumlah entri (top N)"
              value={Number(cfg.topN ?? 5)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("topN", n)}
            />
            <div>
              <label className={labelCls}>Metrik</label>
              <select
                value={String(cfg.metric ?? "coins")}
                onChange={(e) => setCfg("metric", e.target.value)}
                className={inputCls}
              >
                <option value="coins">Koin</option>
                <option value="gifts">Jumlah gift</option>
              </select>
            </div>
            <NumberField
              label="Jendela (menit, 0 = sejak sesi)"
              value={Number(cfg.windowMinutes ?? 15)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("windowMinutes", Math.max(0, Math.round(n)))}
            />
          </>
        )}

        {layer.type === "goal" && (
          <>
            <div>
              <label className={labelCls}>Label</label>
              <input
                value={String(cfg.label ?? "")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("label", e.target.value)}
                className={inputCls}
              />
            </div>
            <NumberField
              label="Target"
              value={Number(cfg.target ?? 1000)}
              onLive={onLive}
              pushHistory={pushHistory}
              onChange={(n) => setCfg("target", n)}
            />
            <div>
              <label className={labelCls}>Metrik</label>
              <select
                value={String(cfg.metric ?? "coins")}
                onChange={(e) => setCfg("metric", e.target.value)}
                className={inputCls}
              >
                <option value="coins">Koin</option>
                <option value="followers">Follower</option>
              </select>
            </div>
          </>
        )}

        {layer.type === "image" && (
          <>
            <div>
              <label className={labelCls}>URL gambar</label>
              <input
                value={String(cfg.src ?? "")}
                onFocus={pushHistory}
                onChange={(e) => setCfg("src", e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Fit</label>
              <select
                value={String(cfg.fit ?? "contain")}
                onChange={(e) => setCfg("fit", e.target.value)}
                className={inputCls}
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </div>
          </>
        )}

        {layer.type === "game-canvas" && (
          <div>
            <label className={labelCls}>URL game (iframe)</label>
            <input
              value={String(cfg.url ?? "")}
              onFocus={pushHistory}
              onChange={(e) => setCfg("url", e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
        )}
      </section>
    </aside>
  );
}
