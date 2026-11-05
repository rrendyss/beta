// Integrasi test Task 8: connector simulasi → Redis → hub → overlay room.
// Prasyarat: platform (port 3000, custom server) & connector (port 4001) berjalan.
// Jalankan: node scripts/test-connector.mjs (dari apps/platform)
import { io } from "socket.io-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PLATFORM = "http://localhost:3000";
const CONNECTOR = "http://localhost:4001";

const email = `conntest-${Date.now()}@mocci.test`;
const user = await prisma.user.create({ data: { name: "ConnTest", email, passwordHash: "x" } });
const overlay = await prisma.overlay.create({
  data: {
    userId: user.id,
    name: "Conn Test",
    sceneJson: { canvas: { width: 1920, height: 1080 }, layers: [] },
    publicToken: `conntest${Date.now().toString(16)}`,
  },
});

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

// 1. Socket client join room overlay
const socket = io(PLATFORM, { transports: ["websocket"] });
const events = [];
socket.on("event", (e) => events.push(e));
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout join")), 5000);
  socket.on("connect", () => socket.emit("join", { token: overlay.publicToken }));
  socket.on("joined", () => { clearTimeout(t); resolve(); });
});
console.log("✓ join room overlay sukses");

// 2. Buat koneksi simulasi via connector API
const createRes = await fetch(`${CONNECTOR}/api/connections`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ overlayId: overlay.id, username: "simuser", mode: "simulate" }),
});
console.log(createRes.status === 201 ? "✓ POST /api/connections → 201" : `✗ create connection: ${createRes.status}`);
if (createRes.status !== 201) fail("create connection");
const { connection } = await createRes.json();

// 3. Event simulasi mengalir ke room
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout menunggu event simulasi")), 8000);
  const check = setInterval(() => {
    if (events.length >= 3) { clearInterval(check); clearTimeout(t); resolve(); }
  }, 100);
});
const types = [...new Set(events.map((e) => e.type))];
const shapeOk = events.every((e) => typeof e.id === "string" && typeof e.user === "string" && typeof e.amount === "number" && typeof e.createdAt === "string");
console.log(`✓ ${events.length} event diterima di room (tipe: ${types.join(", ")})`);
console.log(shapeOk ? "✓ bentuk NormalizedEvent sesuai kontrak" : "✗ bentuk event tidak sesuai");
if (!shapeOk) fail("event shape");

// 4. Status koneksi live di DB connector
await new Promise((r) => setTimeout(r, 700)); // beri waktu update status
const listRes = await fetch(`${CONNECTOR}/api/connections`);
const list = await listRes.json();
const row = list.connections.find((c) => c.id === connection.id);
console.log(row?.status === "live" ? "✓ status koneksi = live" : `✗ status: ${row?.status}`);
if (row?.status !== "live") fail("status live");

// 5. DELETE → disconnected
const delRes = await fetch(`${CONNECTOR}/api/connections/${connection.id}`, { method: "DELETE" });
console.log(delRes.status === 200 ? "✓ DELETE /api/connections/:id → 200" : `✗ delete: ${delRes.status}`);
if (delRes.status !== 200) fail("delete");
const after = (await (await fetch(`${CONNECTOR}/api/connections`)).json()).connections.find((c) => c.id === connection.id);
console.log(after?.status === "disconnected" ? "✓ status koneksi = disconnected" : `✗ status akhir: ${after?.status}`);
if (after?.status !== "disconnected") fail("status disconnected");

socket.disconnect();
await prisma.overlay.delete({ where: { id: overlay.id } });
await prisma.user.delete({ where: { id: user.id } });
await prisma.$disconnect();
console.log(process.exitCode ? "SEBAGIAN GAGAL" : "SEMUA TES LULUS ✓");
