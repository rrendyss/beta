// Integrasi test game overlay: halaman game tersaji, stream SSE mengalir
// dari sesi simulasi connector ke klien game (tanpa Redis/hub).
// Prasyarat: connector (port 4001) berjalan + Postgres.
// Jalankan: node scripts/test-game.mjs (dari apps/platform)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONNECTOR = "http://localhost:4001";

const email = `gametest-${Date.now()}@mocci.test`;
const user = await prisma.user.create({ data: { name: "GameTest", email, passwordHash: "x" } });
const overlay = await prisma.overlay.create({
  data: {
    userId: user.id,
    name: "Game Test",
    sceneJson: { canvas: { width: 1920, height: 1080 }, layers: [] },
    publicToken: `gametest${Date.now().toString(16)}`,
  },
});

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

// 1. Halaman game tersaji (dan tidak membocorkan path lain)
const pageRes = await fetch(`${CONNECTOR}/games/galaxy-defense`);
const page = pageRes.status === 200 ? await pageRes.text() : "";
console.log(pageRes.status === 200 ? "✓ GET /games/galaxy-defense → 200" : `✗ game page: ${pageRes.status}`);
if (pageRes.status !== 200) fail("game page");
const pageOk = page.includes("<canvas") && page.includes("EventSource");
console.log(pageOk ? "✓ halaman game memuat canvas + EventSource" : "✗ isi halaman game tidak sesuai");
if (!pageOk) fail("game page content");

const missingRes = await fetch(`${CONNECTOR}/games/tidak-ada`);
console.log(missingRes.status === 404 ? "✓ game tak dikenal → 404" : `✗ 404 handling: ${missingRes.status}`);
if (missingRes.status !== 404) fail("404 game");

// 2. Daftar game
const listRes = await fetch(`${CONNECTOR}/games`);
const list = await listRes.json();
console.log(Array.isArray(list.games) && list.games.includes("galaxy-defense")
  ? "✓ GET /games → daftar berisi galaxy-defense"
  : "✗ daftar game kosong");
if (!list.games?.includes("galaxy-defense")) fail("list games");

// 3. Stream SSE dengan token overlay yang belum ada → 404
const badToken = await fetch(`${CONNECTOR}/api/games/stream?token=tidak-ada`);
console.log(badToken.status === 404 ? "✓ stream token tak dikenal → 404" : `✗ stream 404: ${badToken.status}`);
if (badToken.status !== 404) fail("stream 404");

// 4. Sesi simulasi aktif → buka stream SSE (token valid) dan baca event
const createRes = await fetch(`${CONNECTOR}/api/connections`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ overlayId: overlay.id, username: "gamesim", mode: "simulate" }),
});
if (createRes.status !== 201) fail(`create connection: ${createRes.status}`);
const { connection } = await createRes.json();

const stream = await fetch(`${CONNECTOR}/api/games/stream?token=${overlay.publicToken}`);
console.log(stream.status === 200 ? "✓ stream SSE terbuka (token valid)" : `✗ stream: ${stream.status}`);
if (stream.status !== 200) fail("stream open");

const got = [];
if (stream.body) {
  const decoder = new TextDecoder();
  let buf = "";
  const reader = stream.body.getReader();
  const timeout = setTimeout(() => { try { reader.cancel(); } catch { /* selesai */ } }, 9000);
  try {
    while (got.length < 3) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        try {
          const parsed = JSON.parse(dataLine.slice(6));
          if (parsed.event) got.push(parsed.event);
        } catch { /* frame non-JSON — abaikan */ }
      }
    }
  } finally {
    clearTimeout(timeout);
    try { reader.cancel(); } catch { /* selesai */ }
  }
}
console.log(got.length >= 3
  ? `✓ ${got.length} event masuk ke klien game via SSE`
  : `✗ hanya ${got.length} event diterima (timeout)`);
if (got.length < 3) fail("sse events");
const shapeOk = got.every((e) => typeof e.id === "string" && typeof e.user === "string" && typeof e.type === "string");
if (shapeOk) console.log("✓ bentuk event SSE sesuai kontrak NormalizedEvent");
else fail("sse shape");

// 5. Tutup koneksi + bersihkan fixture
const delRes = await fetch(`${CONNECTOR}/api/connections/${connection.id}`, { method: "DELETE" });
if (delRes.status !== 200) fail(`delete connection: ${delRes.status}`);
await prisma.overlay.delete({ where: { id: overlay.id } });
await prisma.user.delete({ where: { id: user.id } });
await prisma.$disconnect();
console.log(process.exitCode ? "SEBAGIAN GAGAL" : "SEMUA TES LULUS ✓");
