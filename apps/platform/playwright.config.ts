import { defineConfig } from "@playwright/test";

// Port khusus E2E agar tidak pernah menabrak server dev/start pengguna di :3000.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    // Pakai Chrome sistem — tanpa download browser Playwright.
    channel: "chrome",
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1600, height: 900 },
  },
  webServer: {
    command: "pnpm start",
    url: `http://localhost:${PORT}`,
    env: { PORT: String(PORT), NODE_ENV: "production" },
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
