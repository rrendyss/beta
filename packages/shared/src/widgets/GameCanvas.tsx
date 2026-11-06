"use client";

import { useEffect, useRef } from "react";
import type { NormalizedEvent } from "../events";
import type { GameCanvasConfig } from "./config";
import { useEventFeed } from "./EventFeedContext";
import { GalaxyDefenseEngine } from "./game-engine";

/**
 * Game bawaan "Galaxy Defense" — widget native, tanpa iframe/URL.
 * Drag-drop dari palette langsung berjalan: feed overlay (sample editor,
 * event live runtime, atau mode demo ?demo=1) menjadi input game.
 */
export function GameCanvas({ config }: { config: GameCanvasConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GalaxyDefenseEngine | null>(null);
  const events = useEventFeed();
  const eventsRef = useRef<NormalizedEvent[]>(events);

  // Buat engine saat mount (atau difficulty berubah) — event terkini ikut
  // diputar sekali agar engine baru tidak kehilangan riwayat buffer.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GalaxyDefenseEngine(canvas, { difficulty: config.difficulty });
    engineRef.current = engine;
    for (const ev of eventsRef.current) engine.push(ev);
    engine.start();
    return () => {
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [config.difficulty]);

  // Teruskan event baru ke engine (dedupe by id di dalam engine).
  useEffect(() => {
    eventsRef.current = events;
    const engine = engineRef.current;
    if (engine) for (const ev of events) engine.push(ev);
  }, [events]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#05060f" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
