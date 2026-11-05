import type { LayerType } from "@mocci/shared";

/** Ukuran default widget baru saat ditambahkan ke kanvas. */
export const DEFAULT_SIZE: Record<LayerType, { w: number; h: number }> = {
  "gift-alert": { w: 560, h: 120 },
  chat: { w: 420, h: 360 },
  leaderboard: { w: 360, h: 320 },
  goal: { w: 480, h: 110 },
  text: { w: 480, h: 100 },
  image: { w: 320, h: 320 },
  "game-canvas": { w: 640, h: 480 },
};

/** Patch transform + config parsial untuk satu layer. */
export interface LayerPatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  config?: Record<string, unknown>;
}
