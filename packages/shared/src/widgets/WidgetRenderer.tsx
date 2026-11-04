"use client";

import type { Layer } from "../scene";
import { ChatBox } from "./ChatBox";
import { GameCanvas } from "./GameCanvas";
import { GiftAlert } from "./GiftAlert";
import { GoalCounter } from "./GoalCounter";
import { ImageWidget } from "./ImageWidget";
import { Leaderboard } from "./Leaderboard";
import { TextWidget } from "./TextWidget";

/**
 * Render satu layer scene JSON menjadi widget.
 * Komponen yang sama dipakai editor (WYSIWYG) dan overlay runtime.
 */
export function WidgetRenderer({ layer }: { layer: Layer }) {
  switch (layer.type) {
    case "gift-alert":
      return <GiftAlert config={layer.config} />;
    case "chat":
      return <ChatBox config={layer.config} />;
    case "leaderboard":
      return <Leaderboard config={layer.config} />;
    case "goal":
      return <GoalCounter config={layer.config} />;
    case "text":
      return <TextWidget config={layer.config} />;
    case "image":
      return <ImageWidget config={layer.config} />;
    case "game-canvas":
      return <GameCanvas config={layer.config} />;
  }
}
