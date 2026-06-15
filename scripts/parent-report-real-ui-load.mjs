/**
 * Real parent-report UI load regression (Playwright + bridge selftest).
 * Truth label: MOCK_UI_PASS — API is mocked via Playwright route (NOT E2E_TRUTH_PASS).
 * Default port 3002 to match dev:run-button; override with PORT / PLAYWRIGHT_BASE_URL.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || "3002";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npx", ["tsx", "scripts/parent-report-bridge-load-selftest.mjs"]);
const playwrightEnv = {
  PORT,
  PLAYWRIGHT_BASE_URL: baseURL,
};
if (process.env.PLAYWRIGHT_WEB_SERVER !== "skip") {
  playwrightEnv.PLAYWRIGHT_WEB_SERVER =
    process.env.PLAYWRIGHT_WEB_SERVER || "npm run dev:run-button";
}
run("npx", ["playwright", "test", "tests/e2e/parent-report-real-ui-load.spec.ts", "--project=chromium"], playwrightEnv);

process.stdout.write(`OK parent-report-real-ui-load (${baseURL})\n`);
