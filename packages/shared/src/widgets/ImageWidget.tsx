"use client";

import type { ImageConfig } from "./config";

/** Elemen gambar statis (logo, banner, dll). */
export function ImageWidget({ config }: { config: ImageConfig }) {
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
