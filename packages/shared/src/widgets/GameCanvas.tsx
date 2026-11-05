"use client";

import type { GameCanvasConfig } from "./config";

/**
 * Embed renderer game dari connector service.
 * Beta: iframe ke URL game (mis. http://localhost:4001/games/dungeon).
 */
export function GameCanvas({ config }: { config: GameCanvasConfig }) {
  if (!config.url) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed rgba(255,255,255,0.35)",
          borderRadius: 8,
          color: "rgba(255,255,255,0.6)",
          fontSize: 14,
          boxSizing: "border-box",
          background: "#000",
        }}
      >
        Atur URL game di Inspector
      </div>
    );
  }
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
