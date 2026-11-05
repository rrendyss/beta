"use client";

import { useEffect, useState } from "react";
import {
  EventFeedProvider,
  SceneRenderer,
  type NormalizedEvent,
  type Scene,
} from "@mocci/shared";
import { io, type Socket } from "socket.io-client";

const MAX_EVENTS = 100;

interface OverlayRuntimeProps {
  overlayId: string;
  token: string;
  initialScene: Scene;
}

/**
 * Overlay runtime: render scene full-screen (skala mengikuti viewport),
 * join room via hub socket.io, dan menerima event live + update scene.
 */
export function OverlayRuntime({ token, initialScene }: OverlayRuntimeProps) {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  // ── Koneksi hub ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket: Socket = io({ path: "/socket.io", transports: ["websocket"] });

    socket.on("connect", () => socket.emit("join", { token }));
    socket.on("event", (event: NormalizedEvent) => {
      setEvents((prev) => [...prev.slice(-(MAX_EVENTS - 1)), event]);
    });
    socket.on("scene-updated", (next: Scene | null) => {
      if (next) setScene(next);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // ── Skala scene mengikuti viewport (OBS 1920x1080 → scale 1) ───────────────
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(
          window.innerWidth / scene.canvas.width,
          window.innerHeight / scene.canvas.height,
        ),
      );
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [scene.canvas.width, scene.canvas.height]);

  const scaledW = scene.canvas.width * scale;
  const scaledH = scene.canvas.height * scale;

  return (
    <EventFeedProvider events={events}>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: `calc(50% - ${scaledW / 2}px)`,
            top: `calc(50% - ${scaledH / 2}px)`,
            width: scaledW,
            height: scaledH,
          }}
        >
          <div
            style={{
              position: "relative",
              width: scene.canvas.width,
              height: scene.canvas.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <SceneRenderer scene={scene} />
          </div>
        </div>
      </div>
    </EventFeedProvider>
  );
}
