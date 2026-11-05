import { z } from "zod";

// ─── Per-widget config schemas ────────────────────────────────────────────────

export const giftAlertConfigSchema = z.object({
  textTemplate: z.string().default("{user} mengirim {gift} x{count}!"),
  durationMs: z.number().int().positive().default(4000),
  soundUrl: z.string().optional(),
  accentColor: z.string().default("#a855f7"),
});

export const chatConfigSchema = z.object({
  maxMessages: z.number().int().positive().max(100).default(20),
  fontSize: z.number().positive().default(16),
  backgroundColor: z.string().default("rgba(0,0,0,0.6)"),
  textColor: z.string().default("#ffffff"),
});

export const leaderboardConfigSchema = z.object({
  title: z.string().default("Top Gifters"),
  topN: z.number().int().min(1).max(50).default(5),
  metric: z.enum(["coins", "gifts"]).default("coins"),
  /** Jendela agregasi menit (0 = sejak sesi dimulai). */
  windowMinutes: z.number().int().min(0).max(1440).default(15),
});

export const goalConfigSchema = z.object({
  label: z.string().default("Goal"),
  target: z.number().positive().default(1000),
  metric: z.enum(["coins", "followers"]).default("coins"),
});

export const textConfigSchema = z.object({
  text: z.string().default("Teks"),
  fontSize: z.number().positive().default(32),
  color: z.string().default("#ffffff"),
  bold: z.boolean().default(true),
  align: z.enum(["left", "center", "right"]).default("center"),
});

export const imageConfigSchema = z.object({
  /** Kosong = belum diatur; widget menampilkan placeholder. */
  src: z.string().default(""),
  fit: z.enum(["contain", "cover"]).default("contain"),
});

export const gameCanvasConfigSchema = z.object({
  /** Kosong = belum diatur; widget menampilkan placeholder. */
  url: z.string().default(""),
});

// ─── Layer & scene ────────────────────────────────────────────────────────────

const transformSchema = {
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().int().default(0),
};

export const layerSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("gift-alert"), config: giftAlertConfigSchema, ...transformSchema }),
  z.object({ id: z.string(), type: z.literal("chat"), config: chatConfigSchema, ...transformSchema }),
  z.object({ id: z.string(), type: z.literal("leaderboard"), config: leaderboardConfigSchema, ...transformSchema }),
  z.object({ id: z.string(), type: z.literal("goal"), config: goalConfigSchema, ...transformSchema }),
  z.object({ id: z.string(), type: z.literal("text"), config: textConfigSchema, ...transformSchema }),
  z.object({ id: z.string(), type: z.literal("image"), config: imageConfigSchema, ...transformSchema }),
  z.object({ id: z.string(), type: z.literal("game-canvas"), config: gameCanvasConfigSchema, ...transformSchema }),
]);

export const sceneSchema = z.object({
  canvas: z.object({
    width: z.number().int().positive().default(1920),
    height: z.number().int().positive().default(1080),
  }),
  layers: z.array(layerSchema).default([]),
});

export type Layer = z.infer<typeof layerSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type LayerType = Layer["type"];

const configByType: Record<LayerType, z.ZodType> = {
  "gift-alert": giftAlertConfigSchema,
  chat: chatConfigSchema,
  leaderboard: leaderboardConfigSchema,
  goal: goalConfigSchema,
  text: textConfigSchema,
  image: imageConfigSchema,
  "game-canvas": gameCanvasConfigSchema,
};

/** Config default untuk widget baru (memakai nilai .default() dari schema). */
export function defaultLayerConfig(type: LayerType): Layer["config"] {
  return configByType[type].parse({}) as Layer["config"];
}

export const WIDGET_LABELS: Record<LayerType, string> = {
  "gift-alert": "Gift Alert",
  chat: "Chat Box",
  leaderboard: "Leaderboard",
  goal: "Goal / Counter",
  text: "Teks",
  image: "Gambar",
  "game-canvas": "Game Canvas",
};

/** Scene kosong untuk overlay baru. */
export function emptyScene(): Scene {
  return { canvas: { width: 1920, height: 1080 }, layers: [] };
}

/** Validasi + normalisasi scene JSON (dipakai API, editor, dan runtime). */
export function parseScene(json: unknown): Scene {
  return sceneSchema.parse(json);
}
