// Mocci Connector Service
// Joins a streamer's TikTok Live, normalizes events (gift/chat/follow),
// and publishes them to Redis pub/sub for the platform's WebSocket hub.
// Implementation lands in task 8 — this is the service skeleton.

import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 4001);

const server = createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "connector" }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`[connector] listening on http://localhost:${PORT}`);
});
