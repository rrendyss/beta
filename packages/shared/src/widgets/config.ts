import type { z } from "zod";
import type {
  chatConfigSchema,
  gameCanvasConfigSchema,
  giftAlertConfigSchema,
  goalConfigSchema,
  imageConfigSchema,
  leaderboardConfigSchema,
  textConfigSchema,
} from "../scene";

export type GiftAlertConfig = z.infer<typeof giftAlertConfigSchema>;
export type ChatConfig = z.infer<typeof chatConfigSchema>;
export type LeaderboardConfig = z.infer<typeof leaderboardConfigSchema>;
export type GoalConfig = z.infer<typeof goalConfigSchema>;
export type TextConfig = z.infer<typeof textConfigSchema>;
export type ImageConfig = z.infer<typeof imageConfigSchema>;
export type GameCanvasConfig = z.infer<typeof gameCanvasConfigSchema>;
