"use client";

import { useMemo } from "react";
import type { GoalConfig } from "./config";
import { useEventFeed } from "./EventFeedContext";

/** Progress bar menuju target (koin gift atau follower baru). */
export function GoalCounter({ config }: { config: GoalConfig }) {
  const events = useEventFeed();

  const current = useMemo(() => {
    if (config.metric === "coins") {
      return events.filter((e) => e.type === "gift").reduce((sum, e) => sum + e.amount, 0);
    }
    return events.filter((e) => e.type === "follow").length;
  }, [events, config.metric]);

  const pct = Math.min(100, Math.round((current / config.target) * 100));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 8,
        padding: 14,
        borderRadius: 12,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}>
        <span>🎯 {config.label}</span>
        <span>
          {current.toLocaleString("id-ID")} / {config.target.toLocaleString("id-ID")}
        </span>
      </div>
      <div style={{ height: 14, borderRadius: 999, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #22d3ee, #a855f7)",
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}
