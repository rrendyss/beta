"use client";

import type { ImageConfig } from "./config";

/** Elemen gambar statis (logo, banner, dll). */
export function ImageWidget({ config }: { config: ImageConfig }) {
  if (!config.src) {
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
        }}
      >
        Atur URL gambar di Inspector
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={config.src}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: config.fit,
          display: "block",
        }}
      />
    </div>
  );
}
