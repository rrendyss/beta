import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    // Pakai Chrome sistem — tanpa download browser Playwright.
    channel: "chrome",
    baseURL: "http://localhost:3000",
    viewport: { width: 1600, height: 900 },
  },
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
