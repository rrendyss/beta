"use client";

import { useMemo } from "react";
import type { LeaderboardConfig } from "./config";
import { useEventFeed } from "./EventFeedContext";

interface Entry {
  user: string;
  value: number;
}

/** Top gifters — agregasi gift events (koin atau jumlah gift). */
export function Leaderboard({ config }: { config: LeaderboardConfig }) {
  const events = useEventFeed();

  const entries = useMemo<Entry[]>(() => {
    const totals = new Map<string, Entry>();
    for (const e of events) {
      if (e.type !== "gift") continue;
      const value = config.metric === "coins" ? e.amount : (e.data?.giftCount ?? 1);
      const prev = totals.get(e.user) ?? { user: e.user, value: 0 };
      prev.value += value;
      totals.set(e.user, prev);
    }
    return [...totals.values()].sort((a, b) => b.value - a.value).slice(0, config.topN);
  }, [events, config.metric, config.topN]);

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 12,
        borderRadius: 12,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflow: "hidden",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>🏆 {config.title}</div>
      {entries.length === 0 && <div style={{ opacity: 0.6, fontSize: 14 }}>Belum ada gift…</div>}
      {entries.map((e, i) => (
        <div
          key={e.user}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            padding: "4px 8px",
            borderRadius: 8,
            background: i === 0 ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.06)",
          }}
        >
          <span>
            {medal[i] ?? `${i + 1}.`} {e.user}
          </span>
          <span style={{ fontWeight: 700 }}>{e.value.toLocaleString("id-ID")}</span>
        </div>
      ))}
    </div>
  );
}
