"use client";

import type { TextConfig } from "./config";

/** Elemen teks statis (judul, caption, dll). */
export function TextWidget({ config }: { config: TextConfig }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: config.align === "left" ? "flex-start" : config.align === "right" ? "flex-end" : "center",
        color: config.color,
        fontSize: config.fontSize,
        fontWeight: config.bold ? 700 : 400,
        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        boxSizing: "border-box",
      }}
    >
      {config.text}
    </div>
  );
}
