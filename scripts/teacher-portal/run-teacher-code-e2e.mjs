#!/usr/bin/env node
/**
 * Stable Playwright run for teacher-code access flows (production server, bound to 127.0.0.1).
 * Skips rebuild when .next/BUILD_ID exists unless PLAYWRIGHT_E2E_FORCE_BUILD=1.
 *   node scripts/teacher-portal/run-teacher-code-e2e.mjs
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function run(cmd, args, extraEnv = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const buildId = join(process.cwd(), ".next", "BUILD_ID");
const prerenderManifest = join(process.cwd(), ".next", "prerender-manifest.json");
if (
  process.env.PLAYWRIGHT_E2E_FORCE_BUILD === "1" ||
  !existsSync(buildId) ||
  !existsSync(prerenderManifest)
) {
  run("npm", ["run", "build"]);
}
run("npx", [
  "playwright",
  "test",
  "tests/e2e/teacher-code-access-login.spec.ts",
  "--project=chromium",
], {
  PLAYWRIGHT_USE_START: "1",
  PLAYWRIGHT_HOST: "127.0.0.1",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3022",
  PORT: "3022",
  E2E_INSECURE_SESSION_COOKIES: "1",
});
