// Fixture E2E task 9: user + overlay dengan scene berisi 5 widget.
// Output JSON: { overlayId, token } — dipakai test browser.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = `e2e-${Date.now()}@mocci.test`;
const user = await prisma.user.create({ data: { name: "E2E", email, passwordHash: "x" } });
const overlay = await prisma.overlay.create({
  data: {
    userId: user.id,
    name: "E2E Widgets",
    publicToken: `e2e${Date.now().toString(16)}`,
    sceneJson: {
      canvas: { width: 1920, height: 1080 },
      layers: [
        {
          id: "w-chat", type: "chat", x: 40, y: 600, width: 420, height: 360,
          config: { maxMessages: 5, fontSize: 16, backgroundColor: "rgba(0,0,0,0.6)", textColor: "#ffffff" },
        },
        {
          id: "w-lb", type: "leaderboard", x: 40, y: 40, width: 380, height: 320,
          config: { title: "Top Gifters", topN: 5, metric: "coins", windowMinutes: 0 },
        },
        {
          id: "w-goal", type: "goal", x: 500, y: 40, width: 520, height: 110,
          config: { label: "Target Koin", target: 1000, metric: "coins" },
        },
        {
          id: "w-alert", type: "gift-alert", x: 500, y: 200, width: 620, height: 120,
          config: { textTemplate: "{user} mengirim {gift} x{count}!", durationMs: 60000, accentColor: "#a855f7" },
        },
        {
          id: "w-text", type: "text", x: 1100, y: 40, width: 480, height: 100,
          config: { text: "E2E Mocci", fontSize: 40, color: "#ffffff", bold: true, align: "center" },
        },
      ],
    },
  },
});
console.log(JSON.stringify({ overlayId: overlay.id, token: overlay.publicToken }));
await prisma.$disconnect();
