// E2E alur penuh (task 10): register → login → buat overlay → edit & autosave
// → buka /overlay/[token] → ingest gift → alert/leaderboard/goal ter-update.
import { expect, test, type Page } from "@playwright/test";

let account: { email: string; password: string };

test.beforeAll(() => {
  account = {
    email: `e2e-${Date.now()}@mocci.test`,
    password: "password-rahasia-123",
  };
});

async function getOverlayToken(page: Page): Promise<string> {
  // Session cookie same-origin — fetch dari konteks halaman.
  return page.evaluate(async () => {
    const res = await fetch("/api/overlays");
    const body = (await res.json()) as { overlays: { publicToken: string }[] };
    return body.overlays[0].publicToken;
  });
}

test("alur penuh streamer: daftar → dashboard → editor → overlay live", async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Register
  await page.goto("/register");
  await page.getByPlaceholder("Nama").fill("Streamer E2E");
  await page.getByPlaceholder("Email").fill(account.email);
  await page.getByPlaceholder("Password (min. 8 karakter)").fill(account.password);
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Overlay Saya" })).toBeVisible();

  // 2. Buat overlay baru → langsung ke editor
  await page.getByRole("button", { name: "+ Overlay Baru" }).click();
  await expect(page).toHaveURL(/\/editor\//);
  await expect(page.getByRole("heading", { name: "Widget" })).toBeVisible();

  // 3. Tambah semua 7 widget dari palette (klik = tambah di tengah kanvas)
  for (const label of ["Gift Alert", "Chat Box", "Leaderboard", "Goal / Counter", "Teks", "Gambar", "Game Canvas"]) {
    await page.getByRole("button", { name: label }).click();
  }
  await expect(page.locator("button", { hasText: "↶" })).toBeEnabled(); // undo tersedia
  // Tunggu autosave selesai
  await expect(page.getByText("Tersimpan")).toBeVisible({ timeout: 10_000 });

  // 4. Scene tersimpan: API mengembalikan 7 layer
  const layerCount = await page.evaluate(async () => {
    const res = await fetch("/api/overlays");
    const body = (await res.json()) as { overlays: { id: string }[] };
    const detail = await fetch(`/api/overlays/${body.overlays[0].id}`);
    const data = (await detail.json()) as { overlay: { sceneJson: { layers: unknown[] } } };
    return data.overlay.sceneJson.layers.length;
  });
  expect(layerCount).toBe(7);

  // 5. Buka overlay runtime (publik, via token)
  const token = await getOverlayToken(page);
  await page.goto(`/overlay/${token}`);
  await expect(page.getByText("🏆 Top Gifters")).toBeVisible();
  await expect(page.getByText("🎯 Goal")).toBeVisible();
  // Widget image/game dengan config default menampilkan placeholder, bukan error
  await expect(page.getByText("Atur URL gambar di Inspector")).toBeVisible();

  // 6. Ingest gift terkontrol → widget ter-update (< ~2s).
  // Origin diambil dari URL halaman = server E2E (bukan host hardcode).
  const gifts = [
    { id: "e2e-g1", type: "gift", user: "budi", amount: 400, data: { giftName: "Rose", giftCount: 1 }, createdAt: new Date().toISOString() },
    { id: "e2e-g2", type: "gift", user: "sari", amount: 600, data: { giftName: "Galaxy", giftCount: 1 }, createdAt: new Date().toISOString() },
  ];
  const ingestRes = await fetch(`${new URL(page.url()).origin}/api/ingest/${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events: gifts }),
  });
  expect(ingestRes.status).toBe(200);

  // Leaderboard: sari (600) di atas budi (400)
  await expect(page.getByText("🥇 sari")).toBeVisible();
  await expect(page.getByText("600")).toBeVisible();
  await expect(page.getByText("🥈 budi")).toBeVisible();
  await expect(page.getByText("400")).toBeVisible();
  const bodyText = await page.evaluate(() => document.body.textContent ?? "");
  expect(bodyText.indexOf("🥇 sari")).toBeLessThan(bodyText.indexOf("🥈 budi"));

  // Goal: 1000/1000 tercapai
  await expect(page.getByText("1.000 / 1.000")).toBeVisible();

  // Gift alert tampil dengan template terisi
  await expect(page.getByText(/mengirim Rose x1!/)).toBeVisible();
});
