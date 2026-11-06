// Mocci Connector Service — API koneksi TikTok Live + mode simulasi.
// Event dinormalisasi lalu dipublish ke Redis untuk direlay hub platform.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { NormalizedEvent } from "@mocci/shared";
import { findConnection, findOverlay, findOverlayByPublicToken, listConnections, pool, updateConnectionStatus, upsertConnection } from "./db.js";
import { gameHub, listGames, readGamePage, streamGameEvents } from "./games.js";
import { LiveSession } from "./live.js";
import { publishEvent, redisPub } from "./redis.js";
import { SimSession } from "./sim.js";

const PORT = Number(process.env.PORT ?? 4001);

interface ActiveSession {
  connectionId: string;
  overlayId: string;
  stop: () => Promise<void>;
}

/** Sesi aktif per connection id. */
const sessions = new Map<string, ActiveSession>();

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function cors(res: ServerResponse): void {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}

// ── Sesi ──────────────────────────────────────────────────────────────────────

function startSession(
  connectionId: string,
  overlayId: string,
  username: string,
  mode: "live" | "simulate",
): ActiveSession {
  const onEvent = (ev: NormalizedEvent) => {
    gameHub.broadcast(overlayId, ev);
    void publishEvent(overlayId, ev).catch((err) =>
      console.warn("[connector] publish gagal:", err.message),
    );
  };
  const onStatus = (status: string, message?: string) => {
    console.log(`[connector] @${username} → ${status}${message ? ` (${message})` : ""}`);
    void updateConnectionStatus(connectionId, status).catch((err) =>
      console.warn("[connector] update status gagal:", err.message),
    );
  };

  const session =
    mode === "live"
      ? new LiveSession(username, onEvent, onStatus)
      : new SimSession(onEvent, onStatus);

  void session.start().catch((err) => {
    console.warn(`[connector] start @${username} gagal:`, String(err));
    onStatus("error", String(err));
  });

  const active: ActiveSession = {
    connectionId,
    overlayId,
    stop: () => session.stop(),
  };
  sessions.set(connectionId, active);
  return active;
}

async function stopSession(connectionId: string): Promise<boolean> {
  const active = sessions.get(connectionId);
  if (!active) return false;
  sessions.delete(connectionId);
  await active.stop();
  return true;
}

// ── API ───────────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  void handle(req, res, url).catch((err) => {
    console.error("[connector] handler error:", err);
    json(res, 500, { error: "internal error" });
  });
});

async function handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const { pathname } = url;

  if (req.method === "GET" && pathname === "/api/health") {
    json(res, 200, { ok: true, service: "connector", sessions: sessions.size });
    return;
  }

  if (req.method === "GET" && pathname === "/api/connections") {
    json(res, 200, { connections: await listConnections() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/connections") {
    const body = await readJson(req);
    if (!body) {
      json(res, 400, { error: "Body JSON tidak valid" });
      return;
    }
    const overlayId = typeof body.overlayId === "string" ? body.overlayId.trim() : "";
    const usernameRaw = typeof body.username === "string" ? body.username.trim() : "";
    const mode = body.mode === "live" ? "live" : "simulate";

    if (!overlayId || !usernameRaw) {
      json(res, 400, { error: "overlayId dan username wajib diisi" });
      return;
    }
    const username = usernameRaw.replace(/^@/, "");
    if (!/^[a-zA-Z0-9._]{2,30}$/.test(username)) {
      json(res, 400, { error: "Format username TikTok tidak valid" });
      return;
    }

    const overlay = await findOverlay(overlayId);
    if (!overlay) {
      json(res, 404, { error: "Overlay tidak ditemukan" });
      return;
    }

    // Hentikan sesi lama bila username sudah punya koneksi aktif.
    const connection = await upsertConnection(overlay.userId, username, "connecting");
    await stopSession(connection.id);

    startSession(connection.id, overlayId, username, mode);
    console.log(`[connector] sesi ${mode} dimulai: @${username} → overlay ${overlayId}`);
    json(res, 201, { connection, mode });
    return;
  }

  const deleteMatch = req.method === "DELETE" && pathname.match(/^\/api\/connections\/([^/]+)$/);
  if (deleteMatch) {
    const id = decodeURIComponent(deleteMatch[1]);
    const existing = await findConnection(id);
    if (!existing) {
      json(res, 404, { error: "Koneksi tidak ditemukan" });
      return;
    }
    await stopSession(id);
    await updateConnectionStatus(id, "disconnected");
    json(res, 200, { ok: true });
    return;
  }

  // ── Games (stream event + halaman game) ───────────────────────────────────
  if (req.method === "GET" && pathname === "/api/games/stream") {
    const token = url.searchParams.get("token")?.trim() ?? "";
    const overlayIdParam = url.searchParams.get("overlayId")?.trim() ?? "";
    let overlayId: string | null = null;
    if (token) {
      overlayId = (await findOverlayByPublicToken(token))?.id ?? null;
    } else if (overlayIdParam) {
      overlayId = (await findOverlay(overlayIdParam))?.id ?? null;
    }
    if (!overlayId) {
      json(res, 404, { error: "Overlay tidak ditemukan (token/overlayId)" });
      return;
    }
    streamGameEvents(res, overlayId);
    return;
  }

  if (req.method === "GET" && pathname === "/games") {
    json(res, 200, { games: await listGames() });
    return;
  }

  const gameMatch = req.method === "GET" && pathname.match(/^\/games\/([^/]+)$/);
  if (gameMatch) {
    const page = await readGamePage(decodeURIComponent(gameMatch[1]));
    if (page === null) {
      json(res, 404, { error: "Game tidak ditemukan" });
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(page);
    return;
  }

  json(res, 404, { error: "not found" });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log("[connector] shutdown…");
  for (const id of [...sessions.keys()]) await stopSession(id);
  redisPub.disconnect();
  await pool.end();
  server.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

server.listen(PORT, () => {
  console.log(`[connector] listening on http://localhost:${PORT}`);
});
