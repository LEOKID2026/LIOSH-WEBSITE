import { defineConfig, devices } from "@playwright/test";

/** Demo school smoke — uses existing server (no webServer spawn). */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 60_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3005",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "he-IL",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      grep: /@demo-school/,
    },
  ],
});
