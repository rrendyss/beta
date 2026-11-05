"use client";

import { useEffect, useRef, useState } from "react";
import type { GiftAlertConfig } from "./config";
import { useEventFeed } from "./EventFeedContext";

interface ActiveAlert {
  key: string;
  text: string;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

/** Alert animasi saat gift masuk — antre per gift, durasi per config. */
export function GiftAlert({ config }: { config: GiftAlertConfig }) {
  const events = useEventFeed();
  const giftEvents = events.filter((e) => e.type === "gift");
  const seenRef = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<ActiveAlert[]>([]);

  useEffect(() => {
    const fresh = giftEvents.filter((e) => !seenRef.current.has(e.id));
    if (fresh.length === 0) return;
    fresh.forEach((e) => seenRef.current.add(e.id));
    setQueue((q) => [
      ...q,
      ...fresh.map((e) => ({
        key: e.id,
        text: renderTemplate(config.textTemplate, {
          user: e.user,
          gift: e.data?.giftName ?? "Gift",
          count: String(e.data?.giftCount ?? 1),
        }),
      })),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftEvents.length, config.textTemplate]);

  useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), config.durationMs);
    return () => clearTimeout(t);
  }, [queue, config.durationMs]);

  const current = queue[0];
  if (!current) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <style>{`@keyframes mocci-alert-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      <div
      key={current.key}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "mocci-alert-in 400ms ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 28px",
          borderRadius: 16,
          background: `linear-gradient(135deg, ${config.accentColor}33, ${config.accentColor}cc)`,
          border: `2px solid ${config.accentColor}`,
          boxShadow: `0 0 24px ${config.accentColor}66`,
          color: "#fff",
          fontSize: 28,
          fontWeight: 700,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap",
        }}
      >
        🎁 {current.text}
      </div>
      </div>
    </div>
  );
}
