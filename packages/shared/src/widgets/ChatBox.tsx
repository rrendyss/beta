"use client";

import type { ChatConfig } from "./config";
import { useEventFeed } from "./EventFeedContext";

/** Daftar komentar live, terbaru di bawah. */
export function ChatBox({ config }: { config: ChatConfig }) {
  const events = useEventFeed();
  const messages = events.filter((e) => e.type === "chat").slice(-config.maxMessages);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 6,
        padding: 12,
        borderRadius: 12,
        background: config.backgroundColor,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            fontSize: config.fontSize,
            color: config.textColor,
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            lineHeight: 1.4,
            overflowWrap: "anywhere",
          }}
        >
          <strong style={{ color: "#7dd3fc" }}>{m.user}</strong>: {m.data?.message ?? ""}
        </div>
      ))}
    </div>
  );
}
