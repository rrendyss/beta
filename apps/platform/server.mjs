// Custom server Mocci: Next.js + socket.io hub + subscriber Redis pub/sub.
// Jalankan: pnpm start (dari apps/platform) → node --env-file=.env server.mjs
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import Redis from "ioredis";
import next from "next";

const port = Number(process.env.PORT || 3000);
const dev = process.env.NODE_ENV !== "production";

const prisma = new PrismaClient();
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: "/socket.io" });

  // ── Redis subscriber: relay pesan ke room overlay ──────────────────────────
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const sub = new Redis(redisUrl);
  sub.on("error", (err) => console.warn("[hub] redis sub:", err.message));
  sub.subscribe("mocci:events", "mocci:scene-updates", (err) => {
    if (err) console.error("[hub] gagal subscribe Redis:", err.message);
    else console.log("[hub] subscribed: mocci:events, mocci:scene-updates");
  });
  sub.on("message", (channel, raw) => {
    try {
      const msg = JSON.parse(raw);
      if (channel === "mocci:events" && msg.overlayId && msg.event) {
        io.to(`overlay:${msg.overlayId}`).emit("event", msg.event);
      } else if (channel === "mocci:scene-updates" && msg.overlayId) {
        io.to(`overlay:${msg.overlayId}`).emit("scene-updated", msg.scene ?? null);
      }
    } catch {
      // pesan malformed — abaikan
    }
  });

  // ── Socket.io: client overlay join room via public token ──────────────────
  io.on("connection", (socket) => {
    socket.on("join", async (payload) => {
      const token = payload?.token;
      if (typeof token !== "string" || token.length < 8) {
        socket.emit("join-error", "Token tidak valid");
        return;
      }
      try {
        const overlay = await prisma.overlay.findUnique({
          where: { publicToken: token },
          select: { id: true },
        });
        if (!overlay) {
          socket.emit("join-error", "Overlay tidak ditemukan");
          return;
        }
        await socket.join(`overlay:${overlay.id}`);
        socket.emit("joined", { overlayId: overlay.id });
      } catch {
        socket.emit("join-error", "Gagal join room");
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Mocci platform (Next + hub) siap di http://localhost:${port}`);
  });
});
