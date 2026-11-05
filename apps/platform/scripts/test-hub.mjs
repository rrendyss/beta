// Integrasi test Task 7: hub socket.io + ingest + scene-updated relay.
// Jalankan: node --env-file=.env scripts/test-hub.mjs (server harus jalan di :3000)
import { io } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";

const email = `hubtest-${Date.now()}@mocci.test`;
const user = await prisma.user.create({ data: { name: "HubTest", email, passwordHash: "x" } });
const overlay = await prisma.overlay.create({
  data: {
    userId: user.id,
    name: "Hub Test",
    sceneJson: { canvas: { width: 1920, height: 1080 }, layers: [] },
    publicToken: `hubtest${Date.now().toString(16)}`,
  },
});

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

// 1. Halaman overlay ter-render
const pageRes = await fetch(`${BASE}/overlay/${overlay.publicToken}`);
console.log(pageRes.status === 200 ? "✓ GET /overlay/[token] → 200" : `✗ overlay page: ${pageRes.status}`);
if (pageRes.status !== 200) fail("halaman overlay tidak 200");

// 2. Join room + terima event dari ingest API
const socket = io(BASE, { transports: ["websocket"] });
const received = { event: null, scene: null, joined: false };
socket.on("joined", () => { received.joined = true; });
socket.on("event", (e) => { received.event = e; });
socket.on("scene-updated", (s) => { received.scene = s; });

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout menunggu joined")), 5000);
  socket.on("connect", () => socket.emit("join", { token: overlay.publicToken }));
  socket.on("joined", () => { clearTimeout(t); resolve(); });
});
console.log(received.joined ? "✓ join room sukses" : "✗ join gagal");
if (!received.joined) fail("join");

const giftEvent = {
  id: `test-${Date.now()}`,
  type: "gift",
  user: "budi",
  amount: 100,
  data: { giftName: "Rose", giftCount: 5 },
  createdAt: new Date().toISOString(),
};
const ingestRes = await fetch(`${BASE}/api/ingest/${overlay.publicToken}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ events: [giftEvent] }),
});
console.log(ingestRes.status === 200 ? "✓ POST /api/ingest → 200" : `✗ ingest: ${ingestRes.status}`);
if (ingestRes.status !== 200) fail("ingest");

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout menunggu event")), 5000);
  const check = setInterval(() => {
    if (received.event) { clearInterval(check); clearTimeout(t); resolve(); }
  }, 50);
});
console.log(
  received.event?.user === "budi" && received.event?.type === "gift"
    ? "✓ event relayed ke room (user=budi, type=gift)"
    : `✗ event salah: ${JSON.stringify(received.event)}`,
);
if (received.event?.user !== "budi") fail("event relay");

// 3. Scene update via Redis publish → room menerima scene-updated
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const newScene = {
  canvas: { width: 1920, height: 1080 },
  layers: [{ id: "l1", type: "text", x: 10, y: 10, width: 400, height: 80, config: {} }],
};
await redis.publish("mocci:scene-updates", JSON.stringify({ overlayId: overlay.id, scene: newScene }));
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout menunggu scene-updated")), 5000);
  const check = setInterval(() => {
    if (received.scene) { clearInterval(check); clearTimeout(t); resolve(); }
  }, 50);
});
console.log(
  received.scene?.layers?.length === 1 ? "✓ scene-updated relayed ke room" : "✗ scene-updated tidak diterima",
);
if (received.scene?.layers?.length !== 1) fail("scene-updated");

socket.disconnect();
redis.disconnect();
await prisma.overlay.delete({ where: { id: overlay.id } });
await prisma.user.delete({ where: { id: user.id } });
await prisma.$disconnect();
console.log(process.exitCode ? "SEBAGIAN GAGAL" : "SEMUA TES LULUS ✓");
