import { defineConfig, devices } from "@playwright/test";

/** Route QA against an already-running server (PLAYWRIGHT_BASE_URL). */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 45_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001",
    extraHTTPHeaders: {
      Origin: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001",
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "he-IL",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
