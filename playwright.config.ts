import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.PLAYWRIGHT_HOST || "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${HOST}:${PORT}`;
const useProductionServer =
  process.env.PLAYWRIGHT_USE_START === "1" || process.env.PLAYWRIGHT_USE_START === "true";
const readyPath = process.env.PLAYWRIGHT_READY_PATH || "/parent/login";
const defaultServerCommand = useProductionServer
  ? `npx next start -H ${HOST} -p ${PORT}`
  : `npx next dev -H ${HOST} -p ${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 45_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "he-IL",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@webkit-only/,
    },
    {
      name: "webkit",
      use: { ...devices["iPhone 13"] },
      grep: /@webkit-only/,
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER || defaultServerCommand,
    url: `${baseURL}${readyPath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NEXT_PUBLIC_ACTIVITIES_ENABLED: "true",
      E2E_INSECURE_SESSION_COOKIES:
        useProductionServer || process.env.E2E_INSECURE_SESSION_COOKIES === "1" ? "1" : "0",
    },
  },
});
