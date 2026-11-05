// Audit penanganan error API (task 10): pastikan 400/401/403/404 konsisten.
// Prasyarat: platform berjalan di :3000. Jalankan: node --env-file=.env scripts/test-api-errors.mjs
import { sealData } from "iron-session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
let pass = 0;
let failCount = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    pass += 1;
    console.log(`✓ ${label} → ${actual}`);
  } else {
    failCount += 1;
    console.error(`✗ ${label} → ${actual} (harapan: ${expected})`);
  }
}

// Fixture: dua user, overlay milik masing-masing
const suffix = Date.now();
const userA = await prisma.user.create({ data: { name: "A", email: `audit-a-${suffix}@mocci.test`, passwordHash: "x" } });
const userB = await prisma.user.create({ data: { name: "B", email: `audit-b-${suffix}@mocci.test`, passwordHash: "x" } });
const overlayA = await prisma.overlay.create({
  data: { userId: userA.id, name: "A", sceneJson: { canvas: { width: 1920, height: 1080 }, layers: [] }, publicToken: `audit${suffix}a` },
});
const cookieA = (
  await sealData({ userId: userA.id, email: userA.email }, { password: process.env.AUTH_SECRET })
);
const cookieB = (
  await sealData({ userId: userB.id, email: userB.email }, { password: process.env.AUTH_SECRET })
);
const authA = { cookie: `mocci_session=${cookieA}` };
const authB = { cookie: `mocci_session=${cookieB}` };

// ── 401: tanpa sesi ──────────────────────────────────────────────────────────
check("GET /api/overlays tanpa sesi", (await fetch(`${BASE}/api/overlays`)).status, 401);
check("POST /api/overlays tanpa sesi", (await fetch(`${BASE}/api/overlays`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
check("PATCH overlay tanpa sesi", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
check("DELETE overlay tanpa sesi", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "DELETE" })).status, 401);

// ── 400: body rusak / tidak valid ────────────────────────────────────────────
check("POST body JSON rusak (dengan sesi)", (await fetch(`${BASE}/api/overlays`, { method: "POST", headers: { "content-type": "application/json", cookie: authA.cookie }, body: "{bukan-json" })).status, 400);
check("PATCH tanpa field", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "PATCH", headers: { "content-type": "application/json", cookie: authA.cookie }, body: "{}" })).status, 400);
check("PATCH scene tidak valid", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "PATCH", headers: { "content-type": "application/json", cookie: authA.cookie }, body: JSON.stringify({ scene: { layers: [{ type: "bogus" }] } }) })).status, 400);
check("PATCH nama kosong", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "PATCH", headers: { "content-type": "application/json", cookie: authA.cookie }, body: JSON.stringify({ name: "  " }) })).status, 400);
check("POST ingest token valid, event kosong", (await fetch(`${BASE}/api/ingest/${overlayA.publicToken}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: [{ bogus: true }] }) })).status, 400);

// ── 404: resource tidak ada ──────────────────────────────────────────────────
check("GET overlay id asing", (await fetch(`${BASE}/api/overlays/tidak-ada`, { headers: authA })).status, 404);
check("PATCH overlay id asing", (await fetch(`${BASE}/api/overlays/tidak-ada`, { method: "PATCH", headers: { "content-type": "application/json", cookie: authA.cookie }, body: JSON.stringify({ name: "x" }) })).status, 404);
check("DELETE overlay id asing", (await fetch(`${BASE}/api/overlays/tidak-ada`, { method: "DELETE", headers: authA })).status, 404);
check("POST ingest token asing", (await fetch(`${BASE}/api/ingest/token-palsu`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: [] }) })).status, 404);
check("GET /overlay/token asing", (await fetch(`${BASE}/overlay/token-palsu`)).status, 404);

// ── 403: bukan pemilik ───────────────────────────────────────────────────────
check("GET overlay milik user lain", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { headers: authB })).status, 403);
check("PATCH overlay milik user lain", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "PATCH", headers: { "content-type": "application/json", cookie: authB.cookie }, body: JSON.stringify({ name: "bajak" }) })).status, 403);
check("DELETE overlay milik user lain", (await fetch(`${BASE}/api/overlays/${overlayA.id}`, { method: "DELETE", headers: authB })).status, 403);

// ── 200/201: jalur bahagia tetap jalan ──────────────────────────────────────
const created = await fetch(`${BASE}/api/overlays`, { method: "POST", headers: { "content-type": "application/json", cookie: authA.cookie }, body: JSON.stringify({ name: "Audit" }) });
check("POST overlay valid", created.status, 201);
const createdBody = await created.json();
check("PATCH overlay valid", (await fetch(`${BASE}/api/overlays/${createdBody.overlay.id}`, { method: "PATCH", headers: { "content-type": "application/json", cookie: authA.cookie }, body: JSON.stringify({ name: "Audit 2", scene: { canvas: { width: 1920, height: 1080 }, layers: [] } }) })).status, 200);
check("DELETE overlay valid", (await fetch(`${BASE}/api/overlays/${createdBody.overlay.id}`, { method: "DELETE", headers: authA })).status, 200);

// Cleanup
await prisma.overlay.delete({ where: { id: overlayA.id } });
await prisma.user.delete({ where: { id: userA.id } });
await prisma.user.delete({ where: { id: userB.id } });
await prisma.$disconnect();

console.log(`\n${pass} lulus, ${failCount} gagal`);
process.exitCode = failCount > 0 ? 1 : 0;
