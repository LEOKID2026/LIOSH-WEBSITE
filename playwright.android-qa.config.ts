import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.ANDROID_QA_BASE_URL || "https://liosh-website.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "android-production-parity.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 45_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "he-IL",
    ...devices["Pixel 5"],
  },
  projects: [{ name: "android-parity", use: { ...devices["Pixel 5"] } }],
});
