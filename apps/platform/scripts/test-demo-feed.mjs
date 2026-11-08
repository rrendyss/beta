// Verifikasi demo-feed: join room overlay via socket.io, jalankan demo-feed
// --fast, pastikan event sampai ke room (simulasi overlay runtime).
import { io } from "socket.io-client";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const email = `demo-verify-${Date.now()}@mocci.test`;
const user = await prisma.user.create({ data: { name: "V", email, passwordHash: "x" } });
const overlay = await prisma.overlay.create({
  data: {
    userId: user.id,
    name: "Demo Verify",
    publicToken: `demo${Date.now().toString(16)}`,
    sceneJson: { canvas: { width: 1920, height: 1080 }, layers: [] },
  },
});
const token = overlay.publicToken;

const received = [];
const socket = io(BASE, { transports: ["websocket"] });
socket.on("event", (ev) => received.push(ev));
socket.emit("join", { token });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout join")), 8000);
  socket.on("joined", () => { clearTimeout(t); resolve(); });
});
console.log("✓ join room:", overlay.id);

execFileSync("node", [path.join(HERE, "demo-feed.mjs"), token, "--url", BASE, "--fast"], { stdio: "inherit" });
await new Promise((r) => setTimeout(r, 1500));

const types = {};
for (const ev of received) types[ev.type] = (types[ev.type] ?? 0) + 1;
const totalCoins = received.filter((e) => e.type === "gift").reduce((s, e) => s + e.amount, 0);
console.log(`\nditerima di room: ${received.length} event`, types, `— total koin gift: ${totalCoins}`);
if (received.length < 30) { console.error("✗ event kurang dari naskah"); process.exit(1); }
if (!types.gift || !types.chat || !types.follow || !types.like || !types.share) { console.error("✗ tipe tidak lengkap"); process.exit(1); }
if (totalCoins !== 82351) { console.error(`✗ total koin tidak sesuai naskah: ${totalCoins}`); process.exit(1); }
console.log("SEMUA VERIFIKASI LULUS ✓");

socket.close();
await prisma.overlay.delete({ where: { id: overlay.id } });
await prisma.user.delete({ where: { id: user.id } });
await prisma.$disconnect();
process.exit(0);
