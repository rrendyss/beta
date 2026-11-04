"use client";

import type { GameCanvasConfig } from "./config";

/**
 * Embed renderer game dari connector service.
 * Beta: iframe ke URL game (mis. http://localhost:4001/games/dungeon).
 */
export function GameCanvas({ config }: { config: GameCanvasConfig }) {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
      <iframe
        src={config.url}
        title="Mocci Game"
        style={{ width: "100%", height: "100%", border: "none" }}
        allow="autoplay"
      />
    </div>
  );
}
