// Smoke test helper: buat user + overlay uji, lalu seal cookie sesi iron-session
// agar alur ter-autentikasi bisa diuji via curl tanpa browser.
import { sealData } from "iron-session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = `smoke-${Date.now()}@mocci.test`;

const user = await prisma.user.create({
  data: { name: "Smoke", email, passwordHash: "x" },
});
const overlay = await prisma.overlay.create({
  data: {
    userId: user.id,
    name: "Smoke Overlay",
    sceneJson: { canvas: { width: 1920, height: 1080 }, layers: [] },
    publicToken: `smoke${Date.now().toString(16)}`,
  },
});

const cookie = await sealData(
  { userId: user.id, email },
  { password: process.env.AUTH_SECRET },
);

console.log(JSON.stringify({ overlayId: overlay.id, cookie }));
await prisma.$disconnect();
