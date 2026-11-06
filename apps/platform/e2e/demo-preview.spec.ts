// Preview overlay mode demo: buka /overlay/[token]?demo=1 tanpa connector
// dan ingest — pump mock lokal di client harus menggerakkan widget.
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test("mode demo ?demo=1 menggerakkan overlay tanpa connector", async ({ page }) => {
  test.setTimeout(60_000);
  const prisma = new PrismaClient();
  const suffix = Date.now();
  let userId: string | null = null;
  let overlayId: string | null = null;

  try {
    const user = await prisma.user.create({
      data: { name: "Demo", email: `demo-${suffix}@mocci.test`, passwordHash: "x" },
    });
    userId = user.id;
    const overlay = await prisma.overlay.create({
      data: {
        userId: user.id,
        name: "Preview Demo",
        publicToken: `dmp${suffix.toString(16)}`,
        sceneJson: {
          canvas: { width: 1920, height: 1080 },
          layers: [
            {
              id: "lb", type: "leaderboard", x: 40, y: 40, width: 380, height: 320,
              config: { title: "Top Gifters", topN: 5, metric: "coins", windowMinutes: 0 },
            },
            {
              id: "alert", type: "gift-alert", x: 500, y: 40, width: 640, height: 120,
              config: { textTemplate: "{user} mengirim {gift} x{count}!", durationMs: 6000, accentColor: "#a855f7" },
            },
            {
              id: "goal", type: "goal", x: 500, y: 200, width: 520, height: 110,
              config: { label: "Target Koin", target: 1000, metric: "coins" },
            },
            {
              id: "chat", type: "chat", x: 40, y: 600, width: 420, height: 360,
              config: { maxMessages: 5, fontSize: 16, backgroundColor: "rgba(0,0,0,0.6)", textColor: "#ffffff" },
            },
          ],
        },
      },
    });
    overlayId = overlay.id;

    await page.goto(`/overlay/${overlay.publicToken}?demo=1`);

    // Badge mode demo tampil
    await expect(page.getByText("DEMO · data tiruan")).toBeVisible();
    // Gift pertama (event ke-3 dalam pola, ~2.1s) memicu alert ber-template
    await expect(page.getByText(/mengirim .* x\d+!/)).toBeVisible({ timeout: 6000 });
    // Leaderboard keluar dari state kosong
    await expect(page.getByText("Belum ada gift")).toBeHidden({ timeout: 8000 });
    // Goal tidak lagi nol (koin gift pertama minimal 1)
    await expect(page.getByText("0 / 1.000")).toBeHidden({ timeout: 8000 });
  } finally {
    if (overlayId) await prisma.overlay.deleteMany({ where: { id: overlayId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
